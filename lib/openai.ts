import OpenAI from "openai";

// Get OpenAI client - access API key at call time, not module load time
// This ensures environment variables are available in AWS Amplify runtime
// Also supports client-provided API key as fallback
function getOpenAIClient(providedApiKey?: string): OpenAI {
  // Priority: provided API key > environment variable
  const apiKey = providedApiKey || process.env.OPENAI_API_KEY;

  if (!apiKey) {
    // In production, provide a helpful error message
    const isProduction = process.env.NODE_ENV === "production";
    const errorMessage = isProduction
      ? "OpenAI API key is not configured. Please add OPENAI_API_KEY to your AWS Amplify environment variables. Go to: Amplify Console → App Settings → Environment Variables → Add OPENAI_API_KEY. Then redeploy the app. Alternatively, you can enter your API key in Settings."
      : "OPENAI_API_KEY is not set in environment variables. Please create a .env.local file with your OpenAI API key, or enter it in Settings.";
    
    throw new Error(errorMessage);
  }

  return new OpenAI({
    apiKey: apiKey,
  });
}

// Export a function that returns the client (lazy initialization)
// This ensures we check for the API key every time it's accessed
let clientInstance: OpenAI | null = null;
let lastApiKey: string | undefined = undefined;

export function getOpenAI(providedApiKey?: string): OpenAI {
  // If API key changed, recreate client
  if (!clientInstance || (providedApiKey && providedApiKey !== lastApiKey)) {
    clientInstance = getOpenAIClient(providedApiKey);
    lastApiKey = providedApiKey;
  } else if (!providedApiKey && !lastApiKey) {
    // First time initialization with env var
    clientInstance = getOpenAIClient();
    lastApiKey = process.env.OPENAI_API_KEY;
  }
  return clientInstance;
}

// For backward compatibility, export as openai
export const openai = {
  get chat() {
    return getOpenAI().chat;
  },
};

// Export function to create client with specific API key
export function createOpenAIClient(apiKey: string): OpenAI {
  return getOpenAIClient(apiKey);
}

