import { ParsedProblem, Message } from "@/types";
import { logger } from "@/lib/logger";

export class SocraticPromptEngine {
  /**
   * Generate the base system prompt for Socratic tutoring
   */
  generateSystemPrompt(difficultyMode: "elementary" | "middle" | "high" | "advanced" = "middle"): string {
    const modeInstructions = this.getDifficultyInstructions(difficultyMode);
    
    return `You are a patient math tutor following the Socratic method. Your goal is to guide students through problem-solving by asking thoughtful questions, not by providing direct answers.

${modeInstructions}

Core Principles:
1. NEVER give direct answers - only guide through questions
2. Ask leading questions that help students discover solutions
3. Validate understanding at each step
4. Provide encouragement and positive reinforcement
5. If a student is stuck for more than 2 turns, provide a concrete hint (but still not the answer)

Guidelines:
- Start with broad questions: "What are we trying to find?" or "What information do we have?"
- Guide to method selection: "What method might help here?" or "What operation should we use?"
- Break down steps: "What should we do first?" or "Can we simplify this in any way?"
- Validate responses: "Good! Now, what's the next step?" or "That's right! So what does that mean?"
- If stuck: Provide a hint that points in the right direction without giving the answer

Example Interactions:

Example 1 - Solving for x:
Student: "2x + 5 = 13"
Tutor: "Great! What are we trying to find in this problem?"
Student: "x"
Tutor: "Exactly! To get x alone, we need to undo the operations. What operation is being applied to x first?"
Student: "Adding 5"
Tutor: "Right! So if we're adding 5, how can we undo that? What's the opposite of addition?"

Example 2 - Student stuck:
Student: "I don't know what to do"
Tutor: "Let's break it down. What information do we have in the problem?"
Student: "We have 2x + 5 = 13"
Tutor: "Good! Now, what's our goal? What are we solving for?"
Student: "x"
Tutor: "Perfect! To isolate x, we need to get rid of everything else. What's the first thing we should remove?"

Remember: Your role is to guide, not to solve. Help the student discover the solution themselves.`;
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
    const adaptation = this.getAdaptation(stuckCount);
    
    // Use last 6 messages (3 exchanges) to avoid token bloat
    const recentMessages = history.slice(-6);

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
    prompt += "Respond with your next guiding question or hint. Keep it concise and focused (max 250 tokens).";

    // Log prompt length for monitoring
    const promptLength = prompt.length;
    if (promptLength > 2000) {
      logger.warn("Prompt is very long", { length: promptLength, stuckCount });
    }

    return prompt;
  }

  /**
   * Format the problem for the prompt
   */
  private formatProblem(problem: ParsedProblem): string {
    // Enhanced normalization for better formatting
    let normalizedText = problem.text;
    
    // Add spaces between letters and numbers (both directions)
    normalizedText = normalizedText
      .replace(/([a-zA-Z])([0-9])/g, "$1 $2") // Letter before number
      .replace(/([0-9])([a-zA-Z])/g, "$1 $2") // Number before letter
      // Add spaces between lowercase and uppercase letters
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      // Add spaces after punctuation if missing
      .replace(/([.,!?;:])([A-Za-z0-9])/g, "$1 $2")
      // Add spaces before punctuation if missing (but preserve $ for LaTeX)
      .replace(/([A-Za-z0-9])([.,!?;:])(?![0-9])/g, "$1 $2")
      // Normalize multiple spaces
      .replace(/\s+/g, " ")
      // Fix spacing around dollar signs (for LaTeX)
      .replace(/\$\s*([^$]+)\s*\$/, "$$$1$$")
      .trim();

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
   * Adapt prompt based on how stuck the student is
   */
  private getAdaptation(stuckCount: number): string {
    if (stuckCount === 0) {
      return "Context: The student is engaging well. Continue with guiding questions.";
    } else if (stuckCount === 1) {
      return "Context: The student may need more guidance. Ask more specific, focused questions to help them progress.";
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
    // Normalize problem text - fix spacing issues
    const normalizedText = problem.text
      .replace(/([a-z])([A-Z])/g, "$1 $2") // Add space between lowercase and uppercase
      .replace(/([0-9])([A-Za-z])/g, "$1 $2") // Add space between number and letter
      .replace(/([A-Za-z])([0-9])/g, "$1 $2") // Add space between letter and number
      .replace(/\s+/g, " ") // Normalize multiple spaces
      .trim();

    return `I see you're working on: ${normalizedText}

Let's work through this together! What are we trying to find or solve in this problem?`;
  }
}

export const socraticPromptEngine = new SocraticPromptEngine();

