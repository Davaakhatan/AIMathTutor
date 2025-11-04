import OpenAI from "openai";

// Get API key from environment variables
const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  // In production, provide a helpful error message
  const isProduction = process.env.NODE_ENV === "production";
  const errorMessage = isProduction
    ? "OpenAI API key is not configured. Please add OPENAI_API_KEY to your Vercel environment variables. See VERCEL_SETUP.md for instructions."
    : "OPENAI_API_KEY is not set in environment variables. Please create a .env.local file with your OpenAI API key.";
  
  throw new Error(errorMessage);
}

export const openai = new OpenAI({
  apiKey: apiKey,
});

