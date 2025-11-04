import OpenAI from "openai";

// Get API key from environment variables
const apiKey = process.env.OPENAI_API_KEY;

// Create a function to get OpenAI client (lazy initialization)
function getOpenAIClient() {
  if (!apiKey) {
    // In production, provide a helpful error message
    const isProduction = process.env.NODE_ENV === "production";
    const errorMessage = isProduction
      ? "OpenAI API key is not configured. Please add OPENAI_API_KEY to your AWS Amplify environment variables. Go to: Amplify Console → App Settings → Environment Variables → Add OPENAI_API_KEY"
      : "OPENAI_API_KEY is not set in environment variables. Please create a .env.local file with your OpenAI API key.";
    
    throw new Error(errorMessage);
  }

  return new OpenAI({
    apiKey: apiKey,
  });
}

// Export a lazy-initialized client
export const openai = getOpenAIClient();

