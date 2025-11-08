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
  // Need reasonable score (>= 50) AND student must have provided answer
  // Lowered from 60 to 50 because:
  // - Student answer (40) + Completion phrase (25) = 65 (should work)
  // - But "well done" + "solving" (20) + student answer (40) = 60 (was at threshold)
  // - We want to be more lenient when student clearly provided answer and AI confirmed
  // - Also allow if score is high enough even without explicit answer (for edge cases)
  const isCompleted = (score >= 50 && studentProvidedAnswer.found) || 
                      (score >= 70); // High confidence even without explicit answer pattern
  
  let confidence: "low" | "medium" | "high" = "low";
  if (score >= 80 && studentProvidedAnswer.found) confidence = "high";
  else if (score >= 60 && studentProvidedAnswer.found) confidence = "medium";
  else if (score >= 70) confidence = "high"; // High score even without explicit answer pattern

  // Debug logging in development
  if (process.env.NODE_ENV === "development" && messages.length > 0) {
    const lastTutorMsg = tutorMessages[tutorMessages.length - 1]?.content || "";
    const lastUserMsg = userMessages[userMessages.length - 1]?.content || "";
    
    if (!isCompleted && score >= 40) {
      // Log when we're close but not quite there
      console.log("🔍 Completion detection close but not complete:", {
        score,
        isCompleted,
        confidence,
        studentAnswerFound: studentProvidedAnswer.found,
        studentAnswer: studentProvidedAnswer.answer,
        reasons: reasons.slice(0, 3), // First 3 reasons
        lastTutorMsg: lastTutorMsg.substring(0, 80),
        lastUserMsg: lastUserMsg.substring(0, 30),
      });
    }
  }

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
  // Check the last 3 user messages (most recent first)
  const recentMessages = userMessages.slice(-3).reverse();
  
  for (const msg of recentMessages) {
    const content = msg.content.toLowerCase().trim();
    
    // Pattern 1: Just a number (e.g., "7", "27", "24")
    // Match standalone numbers or variable assignments
    const standaloneNumber = /^[-]?\d+\.?\d*$/; // Just a number like "27" or "-5" or "24"
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
    
    // Pattern 4: Extract any number from the message (fallback)
    // This catches cases where the number is part of a longer message
    const numberMatch = content.match(/\b(\d+)\b/);
    if (numberMatch && numberMatch[1]) {
      // Only use this if the message is short (likely just the answer)
      // or if it contains answer-related words
      if (content.length < 20 || 
          content.includes("answer") || 
          content.includes("solution") ||
          content.includes("got") ||
          content.includes("think")) {
        return { found: true, answer: numberMatch[1] };
      }
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
    // Check for variations of "solved it" - including "solved it correctly", "really solved it", etc.
    if (
      content.includes("you've solved it") ||
      content.includes("you solved it") ||
      content.includes("solved it correctly") ||
      content.includes("really solved it") ||
      content.includes("already solved") ||
      content.includes("problem is solved") ||
      content.includes("you've completed") ||
      content.includes("congratulations on completing") ||
      content.includes("congratulations! you solved") ||
      (content.includes("congratulations") && content.includes("completing")) ||
      (content.includes("reached the solution") && content.includes("correct"))
    ) {
      points += 30;
      reasons.push("AI explicitly confirmed problem is solved");
      break;
    }

    // Medium confirmations (20 points)
    // "That's right!" or "That's correct!" are strong enough on their own
    if (
      (content.includes("that's right") || content.includes("that is right")) ||
      (content.includes("that's correct") || content.includes("that is correct")) ||
      ((content.includes("correct") || content.includes("right")) &&
       (content.includes("answer") || content.includes("solution") || content.includes("found")))
    ) {
      points += 20;
      reasons.push("AI confirmed answer/solution is correct");
      break;
    }

    // Weak confirmations (10 points) - but upgrade if combined with solving
    if (
      content.includes("well done") ||
      content.includes("great job") ||
      content.includes("great work") ||
      content.includes("excellent") ||
      content.includes("perfect")
    ) {
      // Check if combined with solving/completion indicators
      if (
        content.includes("solving") ||
        content.includes("solved") ||
        content.includes("correct") ||
        content.includes("right") ||
        content.includes("found") ||
        content.includes("answer") ||
        content.includes("solution")
      ) {
        // Upgrade to medium confirmation if combined with solving
        if (content.includes("solving") || content.includes("solved") || content.includes("solution")) {
          points += 20;
          reasons.push("AI praised with solving confirmation");
        } else {
          points += 10;
          reasons.push("AI praised with confirmation");
        }
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
      "well done!",
      "well done.",
      "great job",
      "great job!",
      "congratulations on solving",
      "congratulations on completing",
      "congratulations! you solved",
      "congratulations! you've solved",
      "you've found the correct answer",
      "that's the correct answer",
      "you've got it right",
      "you got it right",
      "well done on solving the problem",
      "great job on solving",
      "you've solved it correctly",
      "you've really solved it",
      "you've already reached the solution",
      "reached the solution",
      "already solved",
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

