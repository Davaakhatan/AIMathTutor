// Problem-related types
export interface ParsedProblem {
  text: string;
  type?: ProblemType;
  confidence: number;
  imageUrl?: string; // Data URL of uploaded image (for geometry problems with visuals)
}

export enum ProblemType {
  ARITHMETIC = "arithmetic",
  ALGEBRA = "algebra",
  GEOMETRY = "geometry",
  WORD_PROBLEM = "word_problem",
  MULTI_STEP = "multi_step",
  UNKNOWN = "unknown",
}

// Message-related types
export interface Message {
  id: string;
  role: "user" | "tutor";
  content: string;
  timestamp: number;
  mathContent?: string; // LaTeX equations
  isStreaming?: boolean; // Indicates if message is currently being streamed
}

// Session-related types
export interface Session {
  id: string;
  problem?: ParsedProblem;
  messages: Message[];
  createdAt: number;
}

export interface ConversationContext {
  sessionId: string;
  problem: ParsedProblem;
  messages: Message[];
  stuckCount: number;
  lastHintLevel: number;
}

// API request/response types
export interface ParseProblemRequest {
  type: "text" | "image";
  data: string; // Base64 for images, text for text input
  apiKey?: string; // Optional: Client-provided API key as fallback
}

export interface ParseProblemResponse {
  success: boolean;
  problem?: ParsedProblem;
  error?: string;
}

export interface ChatRequest {
  sessionId: string;
  message: string;
  problem?: ParsedProblem;
  difficultyMode?: "elementary" | "middle" | "high" | "advanced";
  apiKey?: string; // Optional: Client-provided API key as fallback
  whiteboardImage?: string; // Base64 image data URL from whiteboard
  stream?: boolean; // Enable streaming responses
  userId?: string; // Optional: User ID for authenticated users (for persistent sessions)
}

export interface ChatResponse {
  success: boolean;
  response?: {
    text: string;
    timestamp: number;
  };
  error?: string;
}

