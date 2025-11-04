# System Patterns
## AI Math Tutor - Socratic Learning Assistant

---

## Architecture Patterns

### 1. Layered Architecture

```
┌─────────────────────────────────┐
│   Presentation Layer (React)     │
│   - Components, UI Logic         │
└──────────────┬──────────────────┘
               │
┌──────────────┴──────────────────┐
│   Application Layer (Services)   │
│   - Business Logic              │
│   - Orchestration               │
└──────────────┬──────────────────┘
               │
┌──────────────┴──────────────────┐
│   Service Layer (OpenAI)         │
│   - External API Integration     │
└─────────────────────────────────┘
```

### 2. Service-Oriented Design

Each service has a single responsibility:
- **ProblemParser**: Extract problems from text/images
- **DialogueManager**: Orchestrate conversations
- **ContextManager**: Manage session state
- **SocraticPromptEngine**: Generate prompts

### 3. Component Composition

React components are composed hierarchically:
- `ChatUI` contains `Message` and `MessageInput`
- `ProblemInput` contains `ImageUpload`
- `Message` contains `MathRenderer`

---

## Data Flow Patterns

### Request Flow

```
User Action
  ↓
Component Handler
  ↓
API Route
  ↓
Service Layer
  ↓
External API
  ↓
Response Processing
  ↓
State Update
  ↓
UI Re-render
```

### State Management Pattern

**Client State** (React):
- UI state (loading, errors)
- Messages array
- Input values

**Server State** (In-Memory):
- Session data
- Conversation history
- Context tracking

---

## Prompt Engineering Patterns

### System Prompt Structure

```
Base Instructions
  ↓
Problem Context
  ↓
Conversation History
  ↓
Adaptive Modifications (based on stuckCount)
  ↓
Final Prompt
```

### Adaptive Prompting

**Level 1 (Normal)**: Standard Socratic questions
- "What are we trying to find?"
- "What information do we have?"

**Level 2 (Stuck 1 turn)**: More specific questions
- "Think about what operation we need to undo first"
- "What's the relationship between these numbers?"

**Level 3 (Stuck 2+ turns)**: Concrete hints
- "Remember: to undo addition, we subtract"
- "Try isolating the variable by doing the opposite operation"

---

## Error Handling Patterns

### Retry Pattern

```typescript
for (let attempt = 0; attempt <= maxRetries; attempt++) {
  try {
    // API call
    return result;
  } catch (error) {
    if (isRetryable(error) && attempt < maxRetries) {
      await delay(attempt); // Exponential backoff
      continue;
    }
    throw error;
  }
}
```

### Error Classification

- **Retryable**: Timeouts, network errors, rate limits (429)
- **Non-Retryable**: Validation errors, API key errors, 400/401
- **User-Friendly Messages**: Format errors for display

---

## Validation Patterns

### Input Validation

1. **Length Checks**: Max 500 chars for text, 10MB for images
2. **Type Checks**: Ensure correct data types
3. **Sanitization**: Remove HTML/script tags
4. **Format Validation**: Check file types, base64 format

### Response Validation

1. **Non-Empty**: Ensure response exists
2. **Length Checks**: Minimum response length
3. **Direct Answer Detection**: Warn if looks like direct answer
4. **Content Checks**: Ensure it's a question/guidance

---

## Session Management Patterns

### Session Lifecycle

```
Create Session
  ↓
Initialize with Problem
  ↓
Add Messages (User/Tutor)
  ↓
Track Context (stuckCount, history)
  ↓
Clear/Reset on Restart
```

### Context Tracking

```typescript
interface ConversationContext {
  sessionId: string;
  problem: ParsedProblem;
  messages: Message[];
  stuckCount: number; // Turns without progress
  lastHintLevel: number;
}
```

---

## Component Patterns

### Controlled Components

All inputs are controlled:
- `value` and `onChange` props
- State managed in parent
- Validation on submit

### Compound Components

Related components grouped:
- `ChatUI` + `Message` + `MessageInput`
- `ProblemInput` + `ImageUpload`

### Presentational vs Container

- **Presentational**: `Message`, `MessageInput`, `ImageUpload`
- **Container**: `ChatUI`, `ProblemInput` (manage state)

---

## API Design Patterns

### RESTful Endpoints

- `POST /api/parse-problem` - Parse problem
- `POST /api/chat` - Send message
- `POST /api/session` - Create session

### Request/Response Contracts

All endpoints follow consistent structure:
```typescript
{
  success: boolean;
  data?: T;
  error?: string;
}
```

### Error Responses

Consistent error format:
```typescript
{
  success: false;
  error: string; // User-friendly message
}
```

---

## Math Rendering Patterns

### LaTeX Detection

Regex patterns to detect math:
- Inline: `$...$` or `\(...\)`
- Block: `$$...$$` or `\[...\]`

### Rendering Strategy

1. Parse content for LaTeX
2. Extract math expressions
3. Render with KaTeX
4. Render remaining text normally

---

## Performance Patterns

### Debouncing

- Input validation debounced
- Search/filter operations debounced

### Memoization

- Expensive calculations memoized
- Component re-renders optimized

### Lazy Loading

- Components loaded on demand
- Images loaded lazily

---

## Security Patterns

### API Key Protection

- Never exposed to frontend
- Only used in API routes
- Stored in environment variables

### Input Sanitization

- All user input sanitized
- HTML/script tags removed
- Length limits enforced

### Error Messages

- No internal details exposed
- User-friendly messages only
- Logging for debugging

---

## Testing Patterns

### Unit Test Structure

```typescript
describe('Service Name', () => {
  it('should handle valid input', () => {
    // Test
  });
  
  it('should handle invalid input', () => {
    // Test
  });
});
```

### Mock Patterns

- Mock OpenAI API responses
- Mock file uploads
- Mock network errors

---

## Deployment Patterns

### Environment-Specific Config

- Development: `.env.local`
- Production: Vercel environment variables
- Different error messages per environment

### Build Optimization

- TypeScript compilation
- Next.js optimization
- Tree shaking
- Code splitting

---

## Future Pattern Considerations

### Database Integration

- Repository pattern for data access
- Migration strategy for in-memory → database

### Caching Strategy

- Redis for session storage
- Cache common problems
- Cache parsed responses

### Queue System

- Background job processing
- Rate limiting queue
- Retry queue for failed requests

