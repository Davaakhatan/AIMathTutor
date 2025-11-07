/**
 * Smart Completion Detection Service
 * 
 * Uses context-aware logic to detect when a problem is truly solved,
 * not just when certain phrases appear. This prevents false positives
 * where the AI confirms a step but the problem isn't actually solved.
 */

import { Message, ParsedProblem } from "@/types";

export interface CompletionScore {
  score: number; // 0-100, higher = more likely completed
  isCompleted: boolean;
  confidence: "low" | "medium" | "high";
  reasons: string[];
}

/**
 * Detect if a problem is truly completed using smart context analysis
 */
export function detectProblemCompletion(
  messages: Message[],
  problem: ParsedProblem
): CompletionScore {
  const reasons: string[] = [];
  let score = 0;

  // Separate messages
  const userMessages = messages.filter(m => m.role === "user");
  const tutorMessages = messages.filter(m => m.role === "tutor");
  
  if (tutorMessages.length === 0 || userMessages.length === 0) {
    return {
      score: 0,
      isCompleted: false,
      confidence: "low",
      reasons: ["No conversation yet"]
    };
  }

  // Get recent messages (last 3 tutor, last 2 user)
  const recentTutorMessages = tutorMessages.slice(-3);
  const recentUserMessages = userMessages.slice(-2);
  const lastTutorMessage = tutorMessages[tutorMessages.length - 1];
  const lastUserMessage = userMessages[userMessages.length - 1];

  // ============================================
  // 1. Check if AI is asking questions (NEGATIVE signal)
  // ============================================
  const tutorContent = lastTutorMessage.content.toLowerCase();
  const hasQuestions = (
    tutorContent.includes("?") ||
    tutorContent.includes("what") ||
    tutorContent.includes("can you") ||
    tutorContent.includes("do you") ||
    tutorContent.includes("how") ||
    tutorContent.includes("which") ||
    tutorContent.includes("tell me") ||
    tutorContent.includes("let's") ||
    /what\s+do\s+you|what\s+is|what\s+are|what\s+would/.test(tutorContent)
  );

  if (hasQuestions) {
    reasons.push("AI is still asking questions - problem not solved");
    return {
      score: 0,
      isCompleted: false,
      confidence: "high",
      reasons
    };
  }

  // ============================================
  // 2. Check if student provided a final answer (POSITIVE signal)
  // ============================================
  const studentProvidedAnswer = checkStudentProvidedAnswer(
    recentUserMessages,
    problem
  );

  if (studentProvidedAnswer.found) {
    score += 40;
    reasons.push(`Student provided answer: ${studentProvidedAnswer.answer}`);
  } else {
    reasons.push("No clear final answer from student");
  }

  // ============================================
  // 3. Check AI confirmation patterns (POSITIVE signal)
  // ============================================
  const confirmationScore = checkAIConfirmation(recentTutorMessages);
  score += confirmationScore.points;
  reasons.push(...confirmationScore.reasons);

  // ============================================
  // 4. Check for explicit completion phrases (POSITIVE signal)
  // ============================================
  const completionPhrases = checkCompletionPhrases(recentTutorMessages);
  score += completionPhrases.points;
  reasons.push(...completionPhrases.reasons);

  // ============================================
  // 5. Check conversation flow (POSITIVE signal)
  // ============================================
  const flowScore = checkConversationFlow(messages, problem);
  score += flowScore.points;
  reasons.push(...flowScore.reasons);

  // ============================================
  // 6. Final determination
  // ============================================
  // Need high score (>= 70) AND student must have provided answer
  const isCompleted = score >= 70 && studentProvidedAnswer.found;
  
  let confidence: "low" | "medium" | "high" = "low";
  if (score >= 80 && studentProvidedAnswer.found) confidence = "high";
  else if (score >= 60 && studentProvidedAnswer.found) confidence = "medium";

  return {
    score: Math.min(100, score),
    isCompleted,
    confidence,
    reasons
  };
}

/**
 * Check if student provided a final answer
 */
function checkStudentProvidedAnswer(
  userMessages: Message[],
  problem: ParsedProblem
): { found: boolean; answer?: string } {
  // Look for numerical answers or explicit answer statements
  for (const msg of userMessages.reverse()) {
    const content = msg.content.toLowerCase().trim();
    
    // Pattern 1: Just a number (e.g., "7", "27", "x = 7")
    // Match standalone numbers or variable assignments
    const standaloneNumber = /^[-]?\d+\.?\d*$/; // Just a number like "27" or "-5"
    if (standaloneNumber.test(content)) {
      return { found: true, answer: content };
    }
    
    // Pattern 1b: Variable assignment (e.g., "x = 7")
    const variablePattern = /(?:^|\s)(?:x|y|z|answer|solution)\s*[=:]\s*([-]?\d+\.?\d*)/;
    const variableMatch = content.match(variablePattern);
    if (variableMatch && variableMatch[1]) {
      return { found: true, answer: variableMatch[1] };
    }

    // Pattern 2: "The answer is X" or "It's X"
    const answerPattern = /(?:the\s+)?(?:answer|solution|it|that|result)\s+(?:is|equals?|:)\s*([-]?\d+\.?\d*)/i;
    const answerMatch = content.match(answerPattern);
    if (answerMatch) {
      return { found: true, answer: answerMatch[1] };
    }

    // Pattern 3: "I got X" or "I think it's X"
    const gotPattern = /(?:i\s+)?(?:got|think|believe|calculated?)\s+(?:it'?s?\s+)?([-]?\d+\.?\d*)/i;
    const gotMatch = content.match(gotPattern);
    if (gotMatch) {
      return { found: true, answer: gotMatch[1] };
    }
  }

  return { found: false };
}

/**
 * Check AI confirmation patterns
 */
function checkAIConfirmation(
  tutorMessages: Message[]
): { points: number; reasons: string[] } {
  let points = 0;
  const reasons: string[] = [];

  for (const msg of tutorMessages.reverse()) {
    const content = msg.content.toLowerCase();

    // Strong confirmations (30 points)
    if (
      content.includes("you've solved it") ||
      content.includes("you solved it") ||
      content.includes("problem is solved") ||
      content.includes("you've completed")
    ) {
      points += 30;
      reasons.push("AI explicitly confirmed problem is solved");
      break;
    }

    // Medium confirmations (20 points)
    if (
      (content.includes("correct") || content.includes("right")) &&
      (content.includes("answer") || content.includes("solution") || content.includes("found"))
    ) {
      points += 20;
      reasons.push("AI confirmed answer/solution is correct");
      break;
    }

    // Weak confirmations (10 points)
    if (
      content.includes("well done") ||
      content.includes("great work") ||
      content.includes("excellent") ||
      content.includes("perfect")
    ) {
      // Only count if combined with answer confirmation
      if (content.includes("correct") || content.includes("right") || content.includes("found")) {
        points += 10;
        reasons.push("AI praised with confirmation");
      }
    }
  }

  return { points, reasons };
}

/**
 * Check for completion phrases
 */
function checkCompletionPhrases(
  tutorMessages: Message[]
): { points: number; reasons: string[] } {
  let points = 0;
  const reasons: string[] = [];

  const lastMessage = tutorMessages[tutorMessages.length - 1];
  if (!lastMessage) return { points, reasons };

  const content = lastMessage.content.toLowerCase();

  // High-value phrases
  const highValuePhrases = [
    "well done on solving",
    "congratulations on solving",
    "you've found the correct answer",
    "that's the correct answer",
  ];

  for (const phrase of highValuePhrases) {
    if (content.includes(phrase)) {
      points += 25;
      reasons.push(`Found completion phrase: "${phrase}"`);
      return { points, reasons };
    }
  }

  // Medium-value phrases
  const mediumValuePhrases = [
    "well done",
    "great work",
    "excellent",
    "perfect",
  ];

  for (const phrase of mediumValuePhrases) {
    if (content.includes(phrase)) {
      // Only count if combined with answer/confirmation
      if (
        content.includes("correct") ||
        content.includes("right") ||
        content.includes("found") ||
        content.includes("answer")
      ) {
        points += 15;
        reasons.push(`Found praise with confirmation: "${phrase}"`);
        return { points, reasons };
      }
    }
  }

  return { points, reasons };
}

/**
 * Check conversation flow - does it look like a completed problem?
 */
function checkConversationFlow(
  messages: Message[],
  problem: ParsedProblem
): { points: number; reasons: string[] } {
  let points = 0;
  const reasons: string[] = [];

  // Check if conversation has enough back-and-forth (indicates working through problem)
  const exchanges = Math.min(
    messages.filter(m => m.role === "user").length,
    messages.filter(m => m.role === "tutor").length
  );

  if (exchanges >= 3) {
    points += 5;
    reasons.push("Sufficient conversation exchanges");
  }

  // Check if last few messages show completion pattern
  // Pattern: Student answer → AI confirms → Student confirms → AI finalizes
  const last4Messages = messages.slice(-4);
  if (last4Messages.length >= 3) {
    const roles = last4Messages.map(m => m.role);
    // Look for pattern: user, tutor, user, tutor (back and forth)
    if (roles.length >= 2 && roles[roles.length - 2] === "user" && roles[roles.length - 1] === "tutor") {
      points += 5;
      reasons.push("Conversation shows completion pattern");
    }
  }

  return { points, reasons };
}

