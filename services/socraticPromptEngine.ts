import { ParsedProblem, Message } from "@/types";

export class SocraticPromptEngine {
  /**
   * Generate the base system prompt for Socratic tutoring
   */
  generateSystemPrompt(): string {
    return `You are a patient math tutor following the Socratic method. Your goal is to guide students through problem-solving by asking thoughtful questions, not by providing direct answers.

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
   * Build the full prompt with context for the LLM
   */
  buildContext(
    problem: ParsedProblem,
    history: Message[],
    stuckCount: number
  ): string {
    const problemContext = this.formatProblem(problem);
    const conversationHistory = this.formatHistory(history);
    const adaptation = this.getAdaptation(stuckCount);
    const recentMessages = history.slice(-6); // Last 3 exchanges

    let prompt = `Problem: ${problemContext}\n\n`;

    if (recentMessages.length > 0) {
      prompt += "Recent conversation:\n";
      recentMessages.forEach((msg) => {
        const role = msg.role === "user" ? "Student" : "Tutor";
        prompt += `${role}: ${msg.content}\n`;
      });
    } else {
      prompt += "This is the start of the conversation.\n";
    }

    prompt += `\n${adaptation}\n\n`;
    prompt += "Respond with your next guiding question or hint. Keep it concise and focused.";

    return prompt;
  }

  /**
   * Format the problem for the prompt
   */
  private formatProblem(problem: ParsedProblem): string {
    let formatted = `Problem: ${problem.text}`;
    
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
    return `I see you're working on: ${problem.text}

Let's work through this together! What are we trying to find or solve in this problem?`;
  }
}

export const socraticPromptEngine = new SocraticPromptEngine();

