# Architecture Documentation
## AI Math Tutor - Socratic Learning Assistant

---

## Table of Contents
1. [System Overview](#system-overview)
2. [Architecture Patterns](#architecture-patterns)
3. [Component Design](#component-design)
4. [Data Flow](#data-flow)
5. [API Design](#api-design)
6. [State Management](#state-management)
7. [Prompt Engineering](#prompt-engineering)
8. [Technology Stack](#technology-stack)
9. [Deployment Architecture](#deployment-architecture)

---

## System Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend Layer                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Chat UI    │  │ Image Upload │  │ Math Render  │      │
│  │  Component   │  │  Component   │  │  Component   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Context    │  │   State      │  │   Utils      │      │
│  │   Manager    │  │   Manager    │  │   (Helpers)  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTP/API Calls
┌───────────────────────────┴─────────────────────────────────┐
│                      Backend API Layer                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Problem    │  │   Dialogue   │  │   Context    │      │
│  │   Parser     │  │   Manager    │  │   Manager    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐                         │
│  │   Prompt     │  │   Session    │                         │
│  │   Engine     │  │   Store      │                         │
│  └──────────────┘  └──────────────┘                         │
└───────────────────────────┬─────────────────────────────────┘
                            │ API Calls
┌───────────────────────────┴─────────────────────────────────┐
│                   External Services                          │
│  ┌──────────────┐  ┌──────────────┐                         │
│  │ OpenAI Vision│  │   GPT-4 API  │                         │
│  │     API      │  │  (Dialogue)  │                         │
│  └──────────────┘  └──────────────┘                         │
└─────────────────────────────────────────────────────────────┘
```

---

## Architecture Patterns

### 1. Layered Architecture
- **Presentation Layer**: React components, UI logic
- **Application Layer**: Business logic, orchestration
- **Service Layer**: External API integrations
- **Data Layer**: State management, session storage

### 2. Component-Based Design
- Modular, reusable components
- Separation of concerns
- Single responsibility principle

### 3. API-First Approach
- RESTful API endpoints
- Clear request/response contracts
- Error handling standardization

### 4. State Management Pattern
- Client-side state for UI
- Server-side state for conversation context
- Separation of concerns

---

## Component Design

### Frontend Components

#### 1. ChatUI Component
**Responsibility**: Main chat interface
**Props**:
- `messages`: Array of message objects
- `onSendMessage`: Function to send messages
- `isLoading`: Boolean loading state

**State**:
- Input text
- Scroll position
- UI state (loading, error)

#### 2. ImageUpload Component
**Responsibility**: Handle image uploads
**Props**:
- `onUpload`: Function called with image file
- `maxSize`: Maximum file size (default: 10MB)
- `acceptedFormats`: Array of accepted formats

**Features**:
- Drag and drop
- File picker
- Preview
- Validation

#### 3. MathRenderer Component
**Responsibility**: Render LaTeX equations
**Props**:
- `content`: String containing LaTeX
- `displayMode`: 'inline' | 'block'

**Implementation**:
- Uses KaTeX or MathJax
- Parses LaTeX from content
- Renders equations

#### 4. Message Component
**Responsibility**: Display individual message
**Props**:
- `message`: Message object
- `role`: 'user' | 'tutor'
- `timestamp`: Optional timestamp

**Features**:
- Math rendering
- Timestamp display
- Role-based styling

### Backend Components

#### 1. ProblemParser Service
**Responsibility**: Extract problem from text/image

```typescript
interface ProblemParser {
  parseText(text: string): Promise<ParsedProblem>;
  parseImage(image: File): Promise<ParsedProblem>;
}

interface ParsedProblem {
  text: string;
  type: ProblemType;
  confidence: number;
}
```

**Strategy Pattern**:
- TextParser: Direct text processing
- ImageParser: OCR via Vision API

#### 2. DialogueManager Service
**Responsibility**: Orchestrate conversation

```typescript
interface DialogueManager {
  initializeConversation(problem: ParsedProblem): Conversation;
  processMessage(
    conversationId: string,
    message: string
  ): Promise<Response>;
  getHistory(conversationId: string): Message[];
}
```

**Features**:
- Conversation state management
- Context tracking
- Response generation

#### 3. SocraticPromptEngine Service
**Responsibility**: Generate Socratic prompts

```typescript
interface SocraticPromptEngine {
  generateSystemPrompt(): string;
  buildContext(
    problem: ParsedProblem,
    history: Message[],
    stuckCount: number
  ): string;
  adaptPrompt(stuckCount: number): string;
}
```

**Logic**:
- Base system prompt
- Context injection
- Adaptive hint escalation

#### 4. ContextManager Service
**Responsibility**: Manage conversation context

```typescript
interface ContextManager {
  createSession(): Session;
  addMessage(sessionId: string, message: Message): void;
  getContext(sessionId: string): ConversationContext;
  clearSession(sessionId: string): void;
}
```

**Storage**:
- In-memory (MVP)
- Redis (future scaling)

---

## Data Flow

### 1. Problem Input Flow

```
User Input (Text/Image)
    ↓
Frontend: ImageUpload/TextInput Component
    ↓
API: POST /api/parse-problem
    ↓
Backend: ProblemParser Service
    ↓
External: OpenAI Vision API (if image)
    ↓
Backend: Return ParsedProblem
    ↓
Frontend: Display parsed problem
    ↓
Frontend: Initialize conversation
```

### 2. Conversation Flow

```
User Message
    ↓
Frontend: ChatUI Component
    ↓
API: POST /api/chat
    ↓
Backend: DialogueManager
    ↓
Backend: ContextManager (get history)
    ↓
Backend: SocraticPromptEngine (build prompt)
    ↓
External: OpenAI GPT-4 API
    ↓
Backend: Process response
    ↓
Backend: ContextManager (save message)
    ↓
Backend: Return response
    ↓
Frontend: Display message with math rendering
```

### 3. State Update Flow

```
User Action
    ↓
Component Event Handler
    ↓
State Manager Update
    ↓
Component Re-render
    ↓
UI Update
```

---

## API Design

### Endpoints

#### POST /api/parse-problem
**Purpose**: Parse problem from text or image

**Request**:
```typescript
{
  type: 'text' | 'image';
  data: string | File; // Base64 or file
}
```

**Response**:
```typescript
{
  success: boolean;
  problem: {
    text: string;
    type: ProblemType;
    confidence: number;
  };
  error?: string;
}
```

#### POST /api/chat
**Purpose**: Send message and get tutor response

**Request**:
```typescript
{
  sessionId: string;
  message: string;
  problem?: ParsedProblem; // If first message
}
```

**Response**:
```typescript
{
  success: boolean;
  response: {
    text: string;
    timestamp: number;
  };
  error?: string;
}
```

#### GET /api/conversation/:sessionId
**Purpose**: Get conversation history

**Response**:
```typescript
{
  success: boolean;
  messages: Message[];
  error?: string;
}
```

#### POST /api/session
**Purpose**: Create new session

**Response**:
```typescript
{
  success: boolean;
  sessionId: string;
}
```

---

## State Management

### Frontend State Structure

```typescript
interface AppState {
  // Session
  sessionId: string | null;
  
  // Problem
  currentProblem: ParsedProblem | null;
  
  // Conversation
  messages: Message[];
  isLoading: boolean;
  
  // UI
  error: string | null;
  uploadState: 'idle' | 'uploading' | 'processing' | 'complete';
}
```

### Message Structure

```typescript
interface Message {
  id: string;
  role: 'user' | 'tutor';
  content: string;
  timestamp: number;
  mathContent?: string; // LaTeX equations
}
```

### Conversation Context

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

## Prompt Engineering

### System Prompt Template

```
You are a patient math tutor following the Socratic method. Your goal is to guide students through problem-solving by asking thoughtful questions, not by providing direct answers.

Core Principles:
1. NEVER give direct answers
2. Ask leading questions that help students discover solutions
3. Validate understanding at each step
4. Provide encouragement and positive reinforcement
5. If a student is stuck for more than 2 turns, provide a concrete hint (but still not the answer)

Problem Context:
{problem_text}

Current State:
- Student is working on: {current_step}
- Previous attempts: {attempt_history}
- Stuck count: {stuck_count}

Guidelines:
- Start with broad questions: "What are we trying to find?"
- Guide to method selection: "What method might help here?"
- Break down steps: "What should we do first?"
- Validate responses: "Good! Now, what's the next step?"
- If stuck: Provide a hint that points in the right direction

Remember: Your role is to guide, not to solve. Help the student discover the solution themselves.
```

### Adaptive Prompting

**Level 1 (Normal)**: Standard Socratic questions
**Level 2 (Stuck 1 turn)**: More specific questions
**Level 3 (Stuck 2+ turns)**: Concrete hints (still not answers)

### Context Building

```typescript
function buildPrompt(
  problem: ParsedProblem,
  history: Message[],
  stuckCount: number
): string {
  const basePrompt = getSystemPrompt();
  const problemContext = formatProblem(problem);
  const conversationHistory = formatHistory(history);
  const adaptation = getAdaptation(stuckCount);
  
  return `${basePrompt}\n\nProblem: ${problemContext}\n\nConversation:\n${conversationHistory}\n\n${adaptation}`;
}
```

---

## Technology Stack

### Frontend
- **Framework**: Next.js 14+ (App Router) or React 18+
- **Styling**: Tailwind CSS
- **Math Rendering**: KaTeX
- **File Upload**: react-dropzone
- **State Management**: Zustand or React Context
- **HTTP Client**: Fetch API or axios

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Next.js API Routes or Express.js
- **LLM**: OpenAI SDK
- **Image Processing**: OpenAI Vision API

### Development
- **Language**: TypeScript
- **Linting**: ESLint
- **Formatting**: Prettier
- **Version Control**: Git

### Deployment
- **Platform**: Vercel (recommended for Next.js)
- **Environment**: Production + Staging
- **CDN**: Automatic (Vercel)

---

## Deployment Architecture

### Production Setup

```
User
  ↓
CDN (Vercel Edge Network)
  ↓
Next.js Application (Serverless Functions)
  ↓
OpenAI API
```

### Environment Configuration

**Development**:
- Local server: `localhost:3000`
- Environment variables in `.env.local`

**Production**:
- Custom domain or Vercel URL
- Environment variables in Vercel dashboard
- Secure API key handling

### Scaling Considerations

**Current (MVP)**:
- Serverless functions (auto-scaling)
- In-memory session storage
- Direct API calls

**Future Enhancements**:
- Redis for session storage
- Database for persistent history
- Rate limiting middleware
- Caching layer

---

## Security Considerations

### API Key Security
- Never expose API keys in frontend
- Store in environment variables
- Use server-side API routes only

### Input Validation
- Validate all user inputs
- Sanitize file uploads
- Check file sizes and types
- Rate limit API calls

### Error Handling
- Don't expose internal errors to users
- Log errors server-side
- Provide user-friendly error messages

---

## Performance Optimization

### Frontend
- Code splitting
- Lazy loading components
- Optimize images
- Memoization for expensive renders

### Backend
- Efficient prompt construction
- Context window optimization
- Response streaming (future)
- Caching common responses

### API Usage
- Minimize API calls
- Optimize context size
- Batch operations when possible
- Monitor usage and costs

---

## Future Enhancements

### Architecture Improvements
1. **Database Integration**: Persistent conversation history
2. **Caching Layer**: Redis for common problems
3. **Queue System**: For handling high load
4. **Analytics**: Track usage and learning patterns

### Feature Additions
1. **Multi-user Support**: User accounts and sessions
2. **Problem Library**: Database of problems
3. **Progress Tracking**: Learning analytics
4. **Teacher Dashboard**: Monitor student progress

---

## Documentation Standards

### Code Comments
- JSDoc for functions
- Inline comments for complex logic
- README for setup instructions

### API Documentation
- OpenAPI/Swagger specs (future)
- Clear request/response examples
- Error code documentation

---

## Testing Strategy

### Unit Tests
- Component tests (React Testing Library)
- Service tests (Jest)
- Utility function tests

### Integration Tests
- API endpoint tests
- End-to-end conversation flows
- Image parsing tests

### Manual Testing
- 5+ problem types
- Various user scenarios
- Error cases
- Edge cases

---

This architecture provides a solid foundation for building a scalable, maintainable AI math tutor application.

