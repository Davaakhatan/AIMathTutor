import OpenAI from "openai";

// Get OpenAI client - access API key at call time, not module load time
// This ensures environment variables are available in AWS Amplify runtime
function getOpenAIClient(): OpenAI {
  // Access environment variable at runtime, not at module load
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    // In production, provide a helpful error message
    const isProduction = process.env.NODE_ENV === "production";
    const errorMessage = isProduction
      ? "OpenAI API key is not configured. Please add OPENAI_API_KEY to your AWS Amplify environment variables. Go to: Amplify Console → App Settings → Environment Variables → Add OPENAI_API_KEY. Then redeploy the app."
      : "OPENAI_API_KEY is not set in environment variables. Please create a .env.local file with your OpenAI API key.";
    
    throw new Error(errorMessage);
  }

  return new OpenAI({
    apiKey: apiKey,
  });
}

// Export a function that returns the client (lazy initialization)
// This ensures we check for the API key every time it's accessed
let clientInstance: OpenAI | null = null;

export function getOpenAI(): OpenAI {
  if (!clientInstance) {
    clientInstance = getOpenAIClient();
  }
  return clientInstance;
}

// For backward compatibility, export as openai
export const openai = {
  get chat() {
    return getOpenAI().chat;
  },
};

