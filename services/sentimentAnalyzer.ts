/**
 * Sentiment Analysis Service
 * Analyzes student messages to detect frustration, confidence, and emotional state
 */

export type SentimentType = "frustrated" | "confident" | "confused" | "encouraged" | "neutral";

export interface SentimentAnalysis {
  type: SentimentType;
  confidence: number; // 0-1
  indicators: string[];
  suggestedTone?: "supportive" | "encouraging" | "celebratory" | "patient" | "normal";
}

/**
 * Analyze sentiment from student message
 */
export function analyzeSentiment(message: string): SentimentAnalysis {
  const lowerMessage = message.toLowerCase().trim();

  // Frustration indicators
  const frustrationPatterns = [
    /(?:i\s+)?(?:don'?t|do\s+not)\s+know/i,
    /(?:i\s+)?(?:can'?t|cannot)\s+(?:solve|understand|do|get|figure)/i,
    /(?:this\s+is\s+)?(?:too\s+)?(?:hard|difficult|impossible|confusing)/i,
    /(?:i\s+)?(?:give\s+up|quit|stuck|lost)/i,
    /(?:i\s+)?(?:don'?t\s+get|don'?t\s+understand)/i,
    /(?:what\s+)?(?:the\s+)?(?:heck|hell)/i,
    /(?:this\s+)?(?:doesn'?t|does\s+not)\s+make\s+sense/i,
    /(?:i\s+)?(?:hate|dislike)\s+(?:this|math|problem)/i,
    /(?:i\s+)?(?:am\s+)?(?:frustrated|annoyed|upset)/i,
  ];

  // Confidence indicators
  const confidencePatterns = [
    /(?:i\s+)?(?:got\s+it|got\s+this|understand|know)/i,
    /(?:that'?s|that\s+is)\s+(?:easy|simple|clear)/i,
    /(?:i\s+)?(?:think|believe)\s+(?:it'?s|the\s+answer\s+is)/i,
    /(?:i\s+)?(?:can\s+)?(?:do\s+this|solve\s+this)/i,
    /(?:makes?\s+)?(?:sense|perfect\s+sense)/i,
  ];

  // Confusion indicators
  const confusionPatterns = [
    /(?:i\s+)?(?:am\s+)?(?:confused|lost|unclear)/i,
    /(?:what|how|why)\s+(?:do|does|is|are)/i,
    /(?:i\s+)?(?:don'?t\s+see|don'?t\s+get)/i,
    /(?:i\s+)?(?:wonder|wondering)/i,
    /(?:could\s+you\s+)?(?:explain|clarify)/i,
  ];

  // Encouragement indicators (positive responses)
  const encouragementPatterns = [
    /(?:yes|yeah|yep|sure|ok|okay|got\s+it)/i,
    /(?:thanks|thank\s+you)/i,
    /(?:that\s+helps|helps|better)/i,
    /(?:i\s+)?(?:see|understand)\s+now/i,
  ];

  // Count matches
  const frustrationMatches = frustrationPatterns.filter(pattern => pattern.test(lowerMessage)).length;
  const confidenceMatches = confidencePatterns.filter(pattern => pattern.test(lowerMessage)).length;
  const confusionMatches = confusionPatterns.filter(pattern => pattern.test(lowerMessage)).length;
  const encouragementMatches = encouragementPatterns.filter(pattern => pattern.test(lowerMessage)).length;

  // Determine sentiment type
  let sentimentType: SentimentType = "neutral";
  let confidence = 0.5;
  const indicators: string[] = [];

  if (frustrationMatches > 0) {
    sentimentType = "frustrated";
    confidence = Math.min(1, frustrationMatches / 3); // Stronger if multiple indicators
    indicators.push("frustration");
  } else if (confidenceMatches > 0) {
    sentimentType = "confident";
    confidence = Math.min(1, confidenceMatches / 2);
    indicators.push("confidence");
  } else if (confusionMatches > 0) {
    sentimentType = "confused";
    confidence = Math.min(1, confusionMatches / 2);
    indicators.push("confusion");
  } else if (encouragementMatches > 0) {
    sentimentType = "encouraged";
    confidence = Math.min(1, encouragementMatches / 2);
    indicators.push("encouragement");
  }

  // Determine suggested tone
  let suggestedTone: "supportive" | "encouraging" | "celebratory" | "patient" | "normal" = "normal";
  
  if (sentimentType === "frustrated") {
    suggestedTone = "patient";
  } else if (sentimentType === "confused") {
    suggestedTone = "supportive";
  } else if (sentimentType === "confident") {
    suggestedTone = "encouraging";
  } else if (sentimentType === "encouraged") {
    suggestedTone = "celebratory";
  }

  return {
    type: sentimentType,
    confidence,
    indicators,
    suggestedTone,
  };
}

/**
 * Analyze conversation history for emotional patterns
 */
export function analyzeConversationHistory(messages: Array<{ role: string; content: string }>): {
  frustrationLevel: number; // 0-1
  recentFrustration: boolean;
  confidenceTrend: "improving" | "declining" | "stable";
  encouragementNeeded: boolean;
} {
  const userMessages = messages.filter(m => m.role === "user");
  
  if (userMessages.length === 0) {
    return {
      frustrationLevel: 0,
      recentFrustration: false,
      confidenceTrend: "stable",
      encouragementNeeded: false,
    };
  }

  // Analyze last 5 messages for recent frustration
  const recentMessages = userMessages.slice(-5);
  const recentFrustrationCount = recentMessages.filter(msg => 
    analyzeSentiment(msg.content).type === "frustrated"
  ).length;
  
  const recentFrustration = recentFrustrationCount >= 2;

  // Calculate overall frustration level
  const frustrationCount = userMessages.filter(msg => 
    analyzeSentiment(msg.content).type === "frustrated"
  ).length;
  const frustrationLevel = Math.min(1, frustrationCount / userMessages.length);

  // Analyze confidence trend (compare first half vs second half)
  const midPoint = Math.floor(userMessages.length / 2);
  const firstHalf = userMessages.slice(0, midPoint);
  const secondHalf = userMessages.slice(midPoint);

  const firstHalfConfident = firstHalf.filter(msg => 
    analyzeSentiment(msg.content).type === "confident"
  ).length;
  const secondHalfConfident = secondHalf.filter(msg => 
    analyzeSentiment(msg.content).type === "confident"
  ).length;

  let confidenceTrend: "improving" | "declining" | "stable" = "stable";
  if (secondHalfConfident > firstHalfConfident) {
    confidenceTrend = "improving";
  } else if (secondHalfConfident < firstHalfConfident) {
    confidenceTrend = "declining";
  }

  const encouragementNeeded = frustrationLevel > 0.3 || recentFrustration || confidenceTrend === "declining";

  return {
    frustrationLevel,
    recentFrustration,
    confidenceTrend,
    encouragementNeeded,
  };
}

/**
 * Get encouragement message based on sentiment
 */
export function getEncouragementMessage(
  sentiment: SentimentAnalysis,
  conversationHistory?: Array<{ role: string; content: string }>
): string {
  if (sentiment.type === "frustrated") {
    return "I understand this can be challenging. Let's break it down into smaller steps. You're doing great just by trying!";
  }
  
  if (sentiment.type === "confused") {
    return "That's okay! Confusion is part of learning. Let's work through this together step by step.";
  }

  if (sentiment.type === "confident") {
    return "Great thinking! You're on the right track. Keep going!";
  }

  if (sentiment.type === "encouraged") {
    return "Wonderful! I'm glad that helped. You're making excellent progress!";
  }

  return "";
}

