# Utilities Guide
## AI Math Tutor - Development Utilities

This guide explains the utility functions and tools available in the project.

---

## 📦 Available Utilities

### 1. Environment Variable Validation (`lib/env.ts`)

Validate and access environment variables safely.

```typescript
import { validateEnv, getEnv, isProduction } from "@/lib/env";

// Validate all required env vars
const { valid, missing } = validateEnv();
if (!valid) {
  console.error("Missing:", missing);
}

// Get env var with fallback
const apiKey = getEnv("OPENAI_API_KEY", "default-key");

// Check environment
if (isProduction()) {
  // Production-specific code
}
```

---

### 2. Logger (`lib/logger.ts`)

Structured logging with automatic dev/prod handling.

```typescript
import { logger } from "@/lib/logger";

logger.debug("Debug message"); // Only in development
logger.info("Info message");
logger.warn("Warning message");
logger.error("Error message");
```

**Features**:
- Automatic timestamp formatting
- Debug logs only in development
- Consistent log format

---

### 3. Rate Limiting (`lib/rateLimit.ts`)

In-memory rate limiting for API endpoints.

```typescript
import { chatRateLimiter, parseRateLimiter, getClientId } from "@/lib/rateLimit";

// Check rate limit
const clientId = getClientId(request);
const limit = chatRateLimiter.check(clientId);

if (!limit.allowed) {
  // Rate limit exceeded
  return new Response("Too many requests", { status: 429 });
}
```

**Rate Limits**:
- Chat: 20 requests per minute
- Parse: 10 requests per minute

**Note**: For production, use Redis-based rate limiting.

---

### 4. Input Validation (`lib/utils.ts`)

Input sanitization and validation utilities.

```typescript
import { 
  sanitizeInput, 
  validateProblemText, 
  formatErrorMessage,
  isRetryableError,
  delay
} from "@/lib/utils";

// Sanitize user input
const clean = sanitizeInput(userInput, 1000);

// Validate problem text
const { valid, error } = validateProblemText(text);
if (!valid) {
  console.error(error);
}

// Format error messages
const friendly = formatErrorMessage(error);

// Check if error is retryable
if (isRetryableError(error)) {
  await delay(attempt); // Exponential backoff
  // Retry...
}
```

---

### 5. Health Check Endpoint (`/api/health`)

Monitor application health and configuration.

```bash
# Check health
curl http://localhost:3002/api/health
```

**Response**:
```json
{
  "status": "ok",
  "timestamp": "2025-11-03T...",
  "environment": {
    "nodeEnv": "development",
    "envVarsValid": true,
    "missingEnvVars": [],
    "openaiConfigured": true
  },
  "version": "1.0.0"
}
```

**Status Codes**:
- `200`: All systems healthy
- `503`: Missing configuration
- `500`: Error checking health

---

### 6. Test Utilities (`scripts/test-utils.ts`)

Automated testing utilities for problem parsing and conversations.

#### Available Test Commands

```bash
# Run all tests
npm run test:all

# Test specific problem type
npm run test:type algebra_linear

# Test parsing a single problem
npm run test:parse "2x + 5 = 13"

# Test conversation flow
npm run test:chat "2x + 5 = 13"
```

#### Test Problem Types

- `arithmetic` - Simple arithmetic problems
- `algebra_linear` - Linear equations
- `algebra_quadratic` - Quadratic equations
- `geometry_area` - Area problems
- `geometry_perimeter` - Perimeter problems
- `geometry_angles` - Angle problems
- `word_simple` - Simple word problems
- `word_percentage` - Percentage word problems
- `word_multi_variable` - Multi-variable word problems
- `multi_step` - Multi-step problems

#### Example Usage

```typescript
import { testProblemParsing, testConversationFlow } from "./scripts/test-utils";

// Test parsing
await testProblemParsing("2x + 5 = 13");

// Test conversation
await testConversationFlow(
  "2x + 5 = 13",
  ["x", "Subtract 5", "Divide by 2"]
);
```

---

## 🛠️ Development Workflow

### 1. Environment Setup

```bash
# Validate environment
node -e "const {validateEnv} = require('./lib/env.ts'); console.log(validateEnv())"
```

### 2. Testing

```bash
# Run all tests
npm run test:all

# Test specific category
npm run test:type algebra_linear

# Test single problem
npm run test:parse "Solve x² + 5x + 6 = 0"
```

### 3. Health Monitoring

```bash
# Check health (in another terminal)
curl http://localhost:3002/api/health | jq
```

### 4. Logging

Use the logger throughout the codebase:

```typescript
import { logger } from "@/lib/logger";

logger.info("Processing request");
logger.error("Error occurred", error);
```

---

## 📊 Rate Limiting

### Current Limits

- **Chat API**: 20 requests/minute per IP
- **Parse API**: 10 requests/minute per IP

### Headers

Rate limit information is included in response headers:

```
X-RateLimit-Limit: 20
X-RateLimit-Remaining: 15
X-RateLimit-Reset: 2025-11-03T12:00:00Z
```

### Production Considerations

For production, replace in-memory rate limiting with:
- Redis-based rate limiting
- Upstash Redis (serverless-friendly)
- Vercel Edge Middleware rate limiting

---

## 🔍 Debugging

### Enable Debug Logging

Debug logs are automatically enabled in development mode.

```typescript
logger.debug("Debug information", { data });
```

### Check Environment

```typescript
import { validateEnv } from "@/lib/env";

const { valid, missing } = validateEnv();
console.log("Valid:", valid, "Missing:", missing);
```

### Health Check

```bash
# Quick health check
curl http://localhost:3002/api/health
```

---

## 🚀 Production Considerations

### Rate Limiting

Replace in-memory rate limiting with Redis:
- Use `@upstash/ratelimit` for Vercel
- Or Redis instance for other platforms

### Logging

In production:
- Use structured logging service (e.g., Datadog, LogRocket)
- Send error logs to error tracking (e.g., Sentry)
- Debug logs are automatically disabled

### Environment Variables

Always validate on startup:

```typescript
import { validateEnv } from "@/lib/env";

const { valid, missing } = validateEnv();
if (!valid) {
  throw new Error(`Missing environment variables: ${missing.join(", ")}`);
}
```

---

## 📝 Best Practices

1. **Always use logger** instead of `console.log`
2. **Validate environment** on application startup
3. **Sanitize all user input** before processing
4. **Handle rate limits gracefully** with user-friendly messages
5. **Test with utilities** before manual testing
6. **Check health endpoint** in monitoring

---

## 🔗 Related Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture
- [TESTING_GUIDE.md](./TESTING_GUIDE.md) - Comprehensive testing guide
- [PROMPT_ENGINEERING.md](./PROMPT_ENGINEERING.md) - Prompt engineering

---

**Last Updated**: Current Session  
**Maintained By**: Development Team

