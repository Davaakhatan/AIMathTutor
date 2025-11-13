import OpenAI from "openai";

// Get OpenAI client - access API key at call time, not module load time
// This ensures environment variables are available in AWS Amplify runtime
// Also supports client-provided API key as fallback
function getOpenAIClient(providedApiKey?: string): OpenAI {
  // Priority: provided API key > environment variable
  let apiKey = providedApiKey || process.env.OPENAI_API_KEY;
  
  // Trim whitespace from API key (common issue when copying/pasting)
  if (apiKey) {
    apiKey = apiKey.trim();
  }

  // Validate API key format
  if (!apiKey || apiKey.length === 0) {
    // In production, provide a helpful error message
    const isProduction = process.env.NODE_ENV === "production";
    const errorMessage = isProduction
      ? "OpenAI API key is not configured. Please add OPENAI_API_KEY to your deployment platform environment variables:\n\nFor Vercel: Project Settings → Environment Variables → Add OPENAI_API_KEY\nFor AWS Amplify: App Settings → Environment Variables → Add OPENAI_API_KEY\n\nThen redeploy the app. Alternatively, you can enter your API key in Settings."
      : "OPENAI API key is not set. Please:\n1. Create/update .env.local with: OPENAI_API_KEY=sk-your-key\n2. Restart your dev server (Next.js requires restart to load .env.local)\n3. Or enter your API key in Settings panel.";
    
    throw new Error(errorMessage);
  }

  // Validate API key format (should start with 'sk-' or 'sk-proj-' for new format)
  if (!apiKey.startsWith("sk-") && !apiKey.startsWith("sk-proj-")) {
    throw new Error(`Invalid API key format. OpenAI API keys should start with 'sk-' or 'sk-proj-'. Your key starts with '${apiKey.substring(0, Math.min(10, apiKey.length))}...'. Please check your API key and try again.`);
  }

  // Validate minimum length (OpenAI keys are typically 51+ characters)
  if (apiKey.length < 20) {
    throw new Error(`API key appears to be too short (${apiKey.length} characters). OpenAI API keys are typically 51+ characters. Please check your API key and try again.`);
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
  // Get the current env var API key (trimmed)
  const currentEnvKey = process.env.OPENAI_API_KEY?.trim();
  
  // Determine which key to use
  const keyToUse = providedApiKey?.trim() || currentEnvKey;
  
  // If API key changed, recreate client
  if (!clientInstance || 
      (providedApiKey && providedApiKey.trim() !== lastApiKey) ||
      (!providedApiKey && currentEnvKey && currentEnvKey !== lastApiKey)) {
    clientInstance = getOpenAIClient(providedApiKey);
    lastApiKey = keyToUse;
  } else if (!providedApiKey && !lastApiKey) {
    // First time initialization with env var
    clientInstance = getOpenAIClient();
    lastApiKey = currentEnvKey;
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

