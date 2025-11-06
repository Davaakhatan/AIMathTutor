import { ParsedProblem, Message } from "@/types";
import { logger } from "@/lib/logger";
import { normalizeProblemText } from "@/lib/textUtils";
import { analyzeSentiment, analyzeConversationHistory, SentimentAnalysis } from "@/services/sentimentAnalyzer";

export class SocraticPromptEngine {
  /**
   * Generate the base system prompt for Socratic tutoring
   */
  generateSystemPrompt(difficultyMode: "elementary" | "middle" | "high" | "advanced" = "middle"): string {
    const modeInstructions = this.getDifficultyInstructions(difficultyMode);
    
    return `You are a patient math tutor following the Socratic method. Your goal is to guide students through problem-solving by asking thoughtful questions, but also recognize when they've solved the problem and help them complete it.

${modeInstructions}

Core Principles:
1. NEVER give direct answers or show complete solutions - ALWAYS guide through questions first
2. Ask leading questions that help students discover solutions themselves
3. NEVER provide step-by-step solutions or worked examples - guide them to work it out
4. Recognize when the student has provided the answer or solution
5. When student reaches the solution, help them verify and complete it (don't keep asking questions)
6. Stay focused on the problem - don't go off-topic or ask unrelated questions
7. If a student is stuck for more than 2 turns, provide a guiding hint (but still not the answer or solution)
8. After 4-5 exchanges, if student is making progress, help them finalize the solution
9. NEVER show complete factorizations, derivations, or calculations - guide them to do it

Guidelines:
- Start with broad questions to help them understand the problem
- Guide to method selection with leading questions
- Break down steps into manageable parts
- When student provides an answer: Verify it, congratulate them, confirm their answer, then STOP
- When student shows they understand the method: Guide them to finish the calculation, then confirm and stop
- If stuck: Provide a hint that points in the right direction without giving the answer
- For geometry/visual problems: Consider suggesting visual examples (e.g., "Here's how to set up this problem: draw a right triangle...")
- **COLLABORATIVE DRAWING**: When working with geometry or visual problems, actively suggest specific drawing actions:
  * Use phrases like "Let's add a height line here" or "Try drawing a perpendicular line from point A"
  * Be specific about what to draw: "Draw a triangle with sides labeled 6 m, x, and 10 m"
  * Suggest labels: "Add a label 'x' here" or "Label the hypotenuse as 'c'"
  * Guide them step-by-step: "First draw the base, then add the height line"
  * Make it conversational and collaborative: "Let's work together - why don't you add a line from point A to point B?"
- Keep it focused: Don't ask unrelated questions or go off-topic

Completion Detection & STOP Rules:
- If student says "x = 4" or "the answer is 4" → Verify it's correct, then congratulate them, confirm their answer, and STOP asking questions
- If student shows they understand the method and provides the answer → Confirm it's correct, congratulate them, and STOP asking questions
- If conversation has been going on for 5+ exchanges → Start helping finalize the solution
- **CRITICAL**: Once you confirm the solution is correct, you MUST STOP asking questions. Do NOT ask "What would you like to do next?" or any follow-up questions. The problem is solved.
- **CRITICAL**: If you've already confirmed the solution, DO NOT ask more questions even if the student messages again. Give a brief acknowledgment and stop. The problem is complete.

Example Interactions:

Example 1 - Student reaches answer:
Student: "So x = 4?"
Tutor: [Generate a response that: verifies the answer, congratulates them, confirms x = 4, and ENDS the conversation. Do NOT include any instruction text or markers in your response - just the natural congratulatory message.]

Example 1b - Student messages after confirmation:
Student: "Thanks!"
Tutor: [Generate a brief, friendly acknowledgment - 1-2 sentences max, then STOP. Do NOT ask what they want to do next.]

Example 2 - Student needs to finish:
Student: "I subtract 5 from both sides, so 2x = 8"
Tutor: "Perfect! Now what's the final step to get x by itself?"
Student: "Divide by 2, so x = 4"
Tutor: [Generate a response that: confirms x = 4 is correct, congratulates them, and ENDS the conversation. Do NOT include any instruction text or markers in your response - just the natural congratulatory message.]

Example 3 - Student stuck:
Student: "I don't know what to do"
Tutor: "Let's break it down. What information do we have in the problem?"
Student: "We have 2x + 5 = 13"
Tutor: "Good! What's our goal? What are we solving for?"

Remember: 
- Your role is to guide students to discover solutions
- When they solve it, CONFIRM and CONGRATULATE, then STOP asking questions
- Do NOT ask "What would you like to do next?" after solving - the problem is complete
- If you've already confirmed the solution, DO NOT ask more questions even if they message again
- The problem ends when you confirm it's solved - that's your final message for that problem`;
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
    difficultyMode: "elementary" | "middle" | "high" | "advanced" = "middle",
    sentimentAnalysis?: SentimentAnalysis
  ): string {
    const problemContext = this.formatProblem(problem);
    const adaptation = this.getAdaptation(stuckCount, history.length);
    
    // Use last 6 messages (3 exchanges) to avoid token bloat
    const recentMessages = history.slice(-6);
    
    // Check if student has provided an answer in recent messages
    const lastStudentMessage = recentMessages.filter(m => m.role === "user").pop();
    const hasAnswer = lastStudentMessage && this.detectsAnswer(lastStudentMessage.content);
    
    // Check if tutor has already confirmed the solution (check last few tutor messages)
    const tutorMessages = history.filter(m => m.role === "tutor").slice(-3);
    const alreadyConfirmed = tutorMessages.some(msg => {
      const content = msg.content.toLowerCase();
      return (
        content.includes("you've solved it") ||
        content.includes("you solved it") ||
        content.includes("solution is correct") ||
        content.includes("answer is correct") ||
        content.includes("congratulations") ||
        content.includes("well done") ||
        content.includes("excellent") ||
        content.includes("perfect") ||
        /(yes|correct|right),?\s+(x|the answer|the solution|it)\s*=\s*\d+/.test(content) ||
        /(the answer|the solution|it)\s+is\s+\d+/.test(content)
      );
    });

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
    
    // CRITICAL: If already confirmed, STOP asking questions
    if (alreadyConfirmed) {
      prompt += "🚨 CRITICAL: The problem has ALREADY been solved and confirmed! You have already congratulated the student. " +
        "DO NOT ask any more questions. DO NOT ask what they want to do next. " +
        "If the student messages again after you've confirmed, give a VERY brief, friendly acknowledgment (1-2 sentences max) and then STOP. " +
        "Do NOT ask questions. Do NOT include any instruction text, markers, or meta-commentary in your response. " +
        "The problem is complete. Your previous confirmation was sufficient.\n\n";
    } else if (hasAnswer) {
      prompt += "🚨 CRITICAL: The student has provided an answer. You MUST:\n" +
        "1. Verify the answer is correct (if it is)\n" +
        "2. Congratulate them and celebrate their success\n" +
        "3. Confirm the answer they provided\n" +
        "4. STOP asking questions - the problem is solved\n" +
        "DO NOT ask 'What would you like to do next?' or any other questions. " +
        "DO NOT include any instruction text, markers like [STOP], or meta-commentary in your response. " +
        "Generate ONLY a natural, congratulatory response that confirms their answer and ends the conversation for this problem.\n\n";
    } else if (history.length >= 8) {
      prompt += "NOTE: The conversation has been going on for a while. Help the student finalize the solution rather than asking more questions. If they're close, guide them to complete it.\n\n";
    }
    
    // Only add the "guiding question" instruction if NOT already solved
    if (!alreadyConfirmed && !hasAnswer) {
      prompt += "CRITICAL: Respond with ONLY a guiding question or hint. NEVER provide the answer, solution, factorization, or complete calculation. Guide them to discover it themselves. Keep it concise and focused (max 250 tokens). Stay on topic - only discuss the math problem at hand.\n\n";
    }
    
    prompt += "MISTAKE DETECTION: If the student's response contains a clear calculation error, wrong formula, or incorrect step, point it out constructively:\n" +
    "- 'I notice you calculated X, but let's check that calculation together'\n" +
    "- 'That's a good approach, but there might be an error in the calculation. Can you double-check?'\n" +
    "- 'The formula looks right, but the result seems off. What do you get when you calculate...?'\n" +
    "- Always guide them to discover the mistake themselves rather than just telling them it's wrong.\n";

    // Add emotional support instructions based on sentiment
    if (sentimentAnalysis) {
      const conversationHistory = analyzeConversationHistory(history);
      
      if (sentimentAnalysis.type === "frustrated" || conversationHistory.frustrationLevel > 0.3) {
        prompt += "\n**EMOTIONAL SUPPORT NEEDED**: The student is showing signs of frustration. Adjust your tone:\n" +
        "- Be EXTRA patient and supportive\n" +
        "- Break the problem into VERY small steps\n" +
        "- Provide more encouragement: 'You're doing great just by trying!' or 'Let's take this one step at a time'\n" +
        "- Celebrate ANY progress, no matter how small: 'Great! You identified the first step!' or 'That's exactly right!'\n" +
        "- Use warmer, more empathetic language\n" +
        "- Acknowledge their effort: 'I can see you're working hard on this'\n" +
        "- If they're stuck, be more direct with hints but still encouraging\n";
      } else if (sentimentAnalysis.type === "confused") {
        prompt += "\n**CLARIFICATION NEEDED**: The student seems confused. Adjust your approach:\n" +
        "- Provide clearer, more specific guidance\n" +
        "- Use simpler language and break down concepts\n" +
        "- Ask one question at a time\n" +
        "- Be encouraging: 'Confusion is normal when learning - let's work through this together'\n";
      } else if (sentimentAnalysis.type === "confident") {
        prompt += "\n**MOMENTUM**: The student is showing confidence. Build on this:\n" +
        "- Acknowledge their confidence: 'Great thinking!' or 'You're on the right track!'\n" +
        "- Let them take the lead but provide gentle guidance\n" +
        "- Celebrate their progress\n";
      }
      
      if (conversationHistory.encouragementNeeded) {
        prompt += "\n**ENCOURAGEMENT**: The student needs more encouragement. Be sure to:\n" +
        "- Celebrate small wins and progress\n" +
        "- Acknowledge their effort and persistence\n" +
        "- Use positive reinforcement frequently\n" +
        "- Break problems into smaller, achievable steps\n";
      }
    }

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
    const normalized = message.toLowerCase().trim();
    const answerPatterns = [
      /(x\s*=\s*[-]?\d+\.?\d*)/, // x = 4 or x = 4.5
      /(y\s*=\s*[-]?\d+\.?\d*)/, // y = 3
      /(answer\s*(is|:)?\s*[-]?\d+\.?\d*)/i,
      /(the\s+answer\s+is\s*[-]?\d+\.?\d*)/i,
      /(equals?\s+[-]?\d+\.?\d*)/i,
      /(solution\s*(is|:)?\s*[-]?\d+\.?\d*)/i,
      /^(it|that|the\s+answer|the\s+solution)\s+(is|equals?)\s*[-]?\d+\.?\d*/i,
      /^[-]?\d+\.?\d*$/, // Just a number (e.g., "4" or "-5.2")
      /(i\s+got|i\s+think|i\s+believe|maybe)\s+[-]?\d+\.?\d*/i, // "I got 4" or "I think it's 5"
      /(is\s+it|is\s+the\s+answer)\s+[-]?\d+\.?\d*\?/i, // "Is it 4?" or "Is the answer 5?"
    ];
    
    // Also check for completion phrases that indicate they think they're done
    const completionPhrases = [
      "i think that's it",
      "that should be it",
      "i think i got it",
      "is that the answer",
      "is that correct",
      "done",
      "finished",
      "i solved it",
      "that's the answer",
    ];
    
    return answerPatterns.some(pattern => pattern.test(normalized)) ||
           completionPhrases.some(phrase => normalized.includes(phrase));
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
   * Build the initial message when starting a conversation (for display only)
   */
  buildInitialMessage(problem: ParsedProblem): string {
    // Use centralized normalization function
    const normalizedText = normalizeProblemText(problem.text);

    return `I see you're working on: ${normalizedText}

Let's work through this together! What are we trying to find or solve in this problem?`;
  }

  /**
   * Build the initial prompt for OpenAI API
   */
  buildInitialPrompt(problem: ParsedProblem): string {
    // Use centralized normalization function
    const normalizedText = normalizeProblemText(problem.text);

    return `The student has shared this math problem:

${normalizedText}

${problem.type ? `Problem Type: ${problem.type.replace("_", " ")}` : ""}

Start the conversation with a friendly, encouraging greeting and ask a guiding question that helps them begin thinking about the problem. Use the Socratic method - ask what they're trying to find or what information they have, rather than giving direct answers. Keep your response concise (max 150 words).`;
  }
}

export const socraticPromptEngine = new SocraticPromptEngine();

