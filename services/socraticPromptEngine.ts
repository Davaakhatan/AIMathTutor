import { ParsedProblem, Message } from "@/types";
import { logger } from "@/lib/logger";
import { normalizeProblemText } from "@/lib/textUtils";

export class SocraticPromptEngine {
  /**
   * Generate the base system prompt for Socratic tutoring
   */
  generateSystemPrompt(difficultyMode: "elementary" | "middle" | "high" | "advanced" = "middle"): string {
    const modeInstructions = this.getDifficultyInstructions(difficultyMode);
    
    return `You are a patient math tutor following the Socratic method. Your goal is to guide students through problem-solving by asking thoughtful questions, but also recognize when they've solved the problem and help them complete it.

${modeInstructions}

Core Principles:
1. NEVER give direct answers initially - guide through questions first
2. Ask leading questions that help students discover solutions
3. Recognize when the student has provided the answer or solution
4. When student reaches the solution, help them verify and complete it (don't keep asking questions)
5. Stay focused on the problem - don't go off-topic or ask unrelated questions
6. If a student is stuck for more than 2 turns, provide a concrete hint (but still not the answer)
7. After 4-5 exchanges, if student is making progress, help them finalize the solution

Guidelines:
- Start with broad questions: "What are we trying to find?" or "What information do we have?"
- Guide to method selection: "What method might help here?" or "What operation should we use?"
- Break down steps: "What should we do first?" or "Can we simplify this in any way?"
- When student provides an answer: "Great! Let's verify: [show verification steps]" or "Perfect! So the answer is [confirm their answer]. Well done!"
- When student shows they understand the method: "Excellent! Now let's finish solving: [guide final steps]"
- If stuck: Provide a hint that points in the right direction without giving the answer
- Keep it focused: Don't ask unrelated questions or go off-topic

Completion Detection:
- If student says "x = 4" or "the answer is 4" → Help verify and confirm completion
- If student shows they understand the method → Guide them to finish the calculation
- If conversation has been going on for 5+ exchanges → Start helping finalize the solution
- Don't ask more questions after they've solved it - celebrate and confirm their work

Example Interactions:

Example 1 - Student reaches answer:
Student: "So x = 4?"
Tutor: "Excellent! Yes, x = 4. Let's verify: 2(4) + 5 = 8 + 5 = 13. Perfect! You solved it correctly!"

Example 2 - Student needs to finish:
Student: "I subtract 5 from both sides, so 2x = 8"
Tutor: "Perfect! Now what's the final step to get x by itself?"
Student: "Divide by 2, so x = 4"
Tutor: "Exactly! x = 4. Well done! You solved it step by step."

Example 3 - Student stuck:
Student: "I don't know what to do"
Tutor: "Let's break it down. What information do we have in the problem?"
Student: "We have 2x + 5 = 13"
Tutor: "Good! What's our goal? What are we solving for?"

Remember: Your role is to guide students to discover solutions, but also recognize when they've solved it and help them complete and verify their work. Don't keep asking questions after they've found the answer. Stay focused on solving the problem at hand.`;
  }

  /**
   * Get difficulty-specific instructions
   */
  private getDifficultyInstructions(mode: "elementary" | "middle" | "high" | "advanced"): string {
    switch (mode) {
      case "elementary":
        return `Difficulty Level: Elementary
- Use simple, clear language
- Break problems into very small steps
- Provide more encouragement and positive reinforcement
- Use concrete examples and analogies
- Ask very specific questions to guide thinking`;
      case "middle":
        return `Difficulty Level: Middle School
- Use age-appropriate language
- Balance guidance with independence
- Break problems into manageable steps
- Encourage critical thinking
- Ask guiding questions that help students discover solutions`;
      case "high":
        return `Difficulty Level: High School
- Use more sophisticated language when appropriate
- Encourage independent problem-solving
- Provide less scaffolding, more challenging questions
- Focus on conceptual understanding
- Ask questions that require deeper thinking`;
      case "advanced":
        return `Difficulty Level: Advanced
- Use precise mathematical language
- Minimal scaffolding, encourage self-discovery
- Focus on rigorous problem-solving approaches
- Challenge students with complex questions
- Guide toward elegant solutions and multiple methods`;
      default:
        return "";
    }
  }

  /**
   * Build the full prompt with context for the LLM
   */
  buildContext(
    problem: ParsedProblem,
    history: Message[],
    stuckCount: number,
    difficultyMode: "elementary" | "middle" | "high" | "advanced" = "middle"
  ): string {
    const problemContext = this.formatProblem(problem);
    const adaptation = this.getAdaptation(stuckCount, history.length);
    
    // Use last 6 messages (3 exchanges) to avoid token bloat
    const recentMessages = history.slice(-6);
    
    // Check if student has provided an answer in recent messages
    const lastStudentMessage = recentMessages.filter(m => m.role === "user").pop();
    const hasAnswer = lastStudentMessage && this.detectsAnswer(lastStudentMessage.content);

    let prompt = `Problem: ${problemContext}\n\n`;

    if (recentMessages.length > 0) {
      prompt += "Recent conversation:\n";
      recentMessages.forEach((msg) => {
        const role = msg.role === "user" ? "Student" : "Tutor";
        // Truncate very long messages to prevent token bloat
        const content = msg.content.length > 200 
          ? msg.content.substring(0, 200) + "..." 
          : msg.content;
        prompt += `${role}: ${content}\n`;
      });
    } else {
      prompt += "This is the start of the conversation.\n";
    }

    prompt += `\n${adaptation}\n\n`;
    
    if (hasAnswer) {
      prompt += "IMPORTANT: The student appears to have provided an answer. Help them verify and confirm their solution. Don't ask more questions - celebrate their success and verify their work.\n\n";
    } else if (history.length >= 8) {
      prompt += "NOTE: The conversation has been going on for a while. Help the student finalize the solution rather than asking more questions. If they're close, guide them to complete it.\n\n";
    }
    
    prompt += "Respond with your next guiding question or hint. Keep it concise and focused (max 250 tokens). Stay on topic - only discuss the math problem at hand.";

    // Log prompt length for monitoring
    const promptLength = prompt.length;
    if (promptLength > 2000) {
      logger.warn("Prompt is very long", { length: promptLength, stuckCount });
    }

    return prompt;
  }
  
  /**
   * Detect if student message contains an answer
   */
  private detectsAnswer(message: string): boolean {
    const normalized = message.toLowerCase();
    const answerPatterns = [
      /(x\s*=\s*[-]?\d+)/,
      /(answer\s*(is|:)?\s*[-]?\d+)/,
      /(the\s+answer\s+is)/,
      /(equals?\s+[-]?\d+)/,
      /(solution\s*(is|:)?\s*[-]?\d+)/,
      /^[-]?\d+$/, // Just a number
    ];
    
    return answerPatterns.some(pattern => pattern.test(normalized));
  }

  /**
   * Format the problem for the prompt
   */
  private formatProblem(problem: ParsedProblem): string {
    // Use centralized normalization function
    const normalizedText = normalizeProblemText(problem.text);

    let formatted = `Problem: ${normalizedText}`;
    
    if (problem.type) {
      formatted += `\nProblem Type: ${problem.type.replace("_", " ")}`;
    }

    return formatted;
  }

  /**
   * Format conversation history for the prompt
   */
  private formatHistory(history: Message[]): string {
    if (history.length === 0) {
      return "This is the start of the conversation. The student has just shared their problem.";
    }

    // Only include recent messages to avoid token bloat
    const recentMessages = history.slice(-8); // Last 4 exchanges
    
    let formatted = "Conversation History:\n";
    recentMessages.forEach((msg) => {
      const role = msg.role === "user" ? "Student" : "Tutor";
      formatted += `\n${role}: ${msg.content}`;
    });

    return formatted;
  }

  /**
   * Adapt prompt based on how stuck the student is and conversation length
   */
  private getAdaptation(stuckCount: number, messageCount?: number): string {
    const exchangeCount = messageCount ? Math.floor(messageCount / 2) : 0;
    
    if (stuckCount === 0) {
      if (exchangeCount >= 4) {
        return "Context: The student has been working on this. They may be close to the solution. Help them finalize and verify their answer rather than asking more questions. If they've provided an answer, confirm it and help verify.";
      }
      return "Context: The student is engaging well. Continue with guiding questions, but stay focused on solving the problem.";
    } else if (stuckCount === 1) {
      return "Context: The student may need more guidance. Ask more specific, focused questions to help them progress. Keep it relevant to the problem.";
    } else if (stuckCount === 2) {
      return "Context: The student has been stuck. Provide a concrete hint about the next step, but do NOT give the direct answer. Guide them with a specific action they should take.";
    } else {
      return `Context: The student has been stuck for ${stuckCount} turns. Provide a more direct hint about the approach or method they should use, but still do NOT give the answer. Be encouraging and help them understand why this approach works.`;
    }
  }

  /**
   * Build the initial message when starting a conversation
   */
  buildInitialMessage(problem: ParsedProblem): string {
    // Use centralized normalization function
    const normalizedText = normalizeProblemText(problem.text);

    return `I see you're working on: ${normalizedText}

Let's work through this together! What are we trying to find or solve in this problem?`;
  }
}

export const socraticPromptEngine = new SocraticPromptEngine();

