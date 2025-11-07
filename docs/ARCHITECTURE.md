# Architecture Documentation
## AI Math Tutor - Unified Ecosystem Platform

**Version**: 3.0 (Unified Ecosystem)  
**Last Updated**: November 2025

---

## Table of Contents
1. [Unified Ecosystem Overview](#unified-ecosystem-overview)
2. [System Overview](#system-overview)
3. [Event-Driven Architecture](#event-driven-architecture)
4. [Orchestration Layer](#orchestration-layer)
5. [Architecture Patterns](#architecture-patterns)
6. [Component Design](#component-design)
7. [Data Flow](#data-flow)
8. [API Design](#api-design)
9. [State Management](#state-management)
10. [Database Schema](#database-schema)
11. [Technology Stack](#technology-stack)
12. [Deployment Architecture](#deployment-architecture)

---

## Unified Ecosystem Overview

### The Three Systems, One Platform

This platform integrates **three core systems** into a **unified ecosystem**:

1. **Core AI Tutoring** - Socratic method-based math tutoring
2. **Viral Growth System** - Social features and referral mechanics
3. **AI Study Companion** - Persistent learning companion with memory

**Key Innovation**: These systems communicate via an **event-driven architecture** with an **orchestration layer** that coordinates all interactions.

### Ecosystem Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    UNIFIED ECOSYSTEM PLATFORM                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │              Event Bus (Central Nervous System)          │ │
│  │  problem_completed │ goal_achieved │ streak_at_risk     │ │
│  └────────────────────┬─────────────────────────────────────┘ │
│                       │                                        │
│         ┌─────────────┼─────────────┐                          │
│         │             │             │                         │
│         ▼             ▼             ▼                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                   │
│  │   Core    │  │  Growth  │  │Companion │                   │
│  │ Tutoring  │  │  System  │  │  System  │                   │
│  └─────┬─────┘  └─────┬────┘  └─────┬────┘                   │
│        │              │             │                         │
│        └──────────────┼─────────────┘                         │
│                       │                                        │
│              ┌────────▼────────┐                              │
│              │  Orchestrator   │                              │
│              │   Service       │                              │
│              └────────┬─────────┘                              │
│                       │                                        │
│              ┌────────▼────────┐                              │
│              │   Supabase DB    │                              │
│              │  (Single Source) │                              │
│              └──────────────────┘                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### How Systems Interact

```
User Action: Problem Completed
    ↓
Event: problem_completed
    ↓
Orchestrator (parallel execution):
    ├─→ Growth: Generate challenge + share link
    ├─→ Companion: Summarize session + update memory
    ├─→ Gamification: Award XP + update streak
    └─→ Companion: Check goals + recommend subjects
    ↓
Unified UI: Show all results together
```

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
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Prompt     │  │   Session    │  │ Orchestrator │      │
│  │   Engine     │  │   Store      │  │   Service    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐                         │
│  │   Event Bus  │  │   Growth     │                         │
│  │              │  │   Services   │                         │
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
                            │
┌───────────────────────────┴─────────────────────────────────┐
│                    Supabase (Database)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Auth       │  │   Database  │  │   Storage    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

---

## Event-Driven Architecture

### Event Bus System

The platform uses an **event bus** to enable communication between systems:

```typescript
// lib/eventBus.ts
type EventType = 
  | 'problem_completed'
  | 'goal_achieved'
  | 'streak_at_risk'
  | 'achievement_unlocked'
  | 'session_started'
  | 'session_ended'
  | 'challenge_created'
  | 'share_clicked';

interface Event {
  type: EventType;
  userId: string;
  profileId?: string;
  data: Record<string, any>;
  timestamp: Date;
}

class EventBus {
  private handlers: Map<EventType, Array<(event: Event) => Promise<void>>> = new Map();

  async emit(event: Event): Promise<void> {
    const handlers = this.handlers.get(event.type) || [];
    await Promise.all(handlers.map(handler => handler(event)));
  }

  on(eventType: EventType, handler: (event: Event) => Promise<void>): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType)!.push(handler);
  }

  off(eventType: EventType, handler: Function): void {
    const handlers = this.handlers.get(eventType);
    if (handlers) {
      const index = handlers.findIndex(h => h === handler);
      if (index > -1) handlers.splice(index, 1);
    }
  }
}

export const eventBus = new EventBus();
```

### Event Flow Example

```
User completes problem
    ↓
API: POST /api/chat (problem solved)
    ↓
Event: problem_completed {
  userId: "user-123",
  profileId: "profile-456",
  data: { problem, sessionId, timeSpent }
}
    ↓
Event Bus distributes to handlers:
    ├─→ Growth Handler: Generate challenge
    ├─→ Companion Handler: Summarize session
    ├─→ Gamification Handler: Award XP
    └─→ Analytics Handler: Track event
```

---

## Orchestration Layer

### Ecosystem Orchestrator

The `EcosystemOrchestrator` coordinates all systems when events occur:

```typescript
// services/orchestrator.ts
import { eventBus } from '@/lib/eventBus';
import { generateChallenge } from '@/services/challengeService';
import { createShareLink } from '@/services/shareService';
import { summarizeSession } from '@/services/conversationSummaryService';
import { checkGoals } from '@/services/goalService';
import { awardXP } from '@/services/supabaseDataService';

class EcosystemOrchestrator {
  async onProblemCompleted(userId: string, profileId: string, problem: ParsedProblem, sessionId: string) {
    // Parallel execution for performance
    await Promise.all([
      // Growth actions
      this.triggerGrowthActions(userId, profileId, problem),
      
      // Companion actions
      this.updateCompanionMemory(userId, profileId, sessionId, problem),
      
      // Gamification
      this.updateGamification(userId, profileId, problem),
      
      // Analytics
      this.trackEvent(userId, profileId, 'problem_completed', { problem })
    ]);
  }

  private async triggerGrowthActions(userId: string, profileId: string, problem: ParsedProblem) {
    // Auto-generate challenge
    const challenge = await generateChallenge(userId, profileId, problem);
    
    // Create share link
    const shareLink = await createShareLink(userId, profileId, {
      type: 'problem',
      problem,
      challenge
    });
    
    // Emit event for UI updates
    eventBus.emit({
      type: 'challenge_created',
      userId,
      profileId,
      data: { challenge, shareLink },
      timestamp: new Date()
    });
  }

  private async updateCompanionMemory(userId: string, profileId: string, sessionId: string, problem: ParsedProblem) {
    // Summarize session
    const summary = await summarizeSession(userId, profileId, sessionId);
    
    // Check goals
    const goalUpdates = await checkGoals(userId, profileId, problem);
    
    // Emit event for UI updates
    eventBus.emit({
      type: 'session_ended',
      userId,
      profileId,
      data: { summary, goalUpdates },
      timestamp: new Date()
    });
  }

  private async updateGamification(userId: string, profileId: string, problem: ParsedProblem) {
    await awardXP(userId, profileId, {
      type: 'problem_solved',
      amount: 50,
      problem
    });
  }

  private async trackEvent(userId: string, profileId: string, eventType: string, data: any) {
    // Store in activity_feed table
    // Analytics tracking
  }
}

export const orchestrator = new EcosystemOrchestrator();
```

### Integration Points

The orchestrator integrates with:

1. **Growth System**
   - Challenge generation
   - Share link creation
   - Referral tracking

2. **Study Companion**
   - Session summarization
   - Goal checking
   - Subject recommendations

3. **Gamification**
   - XP awards
   - Streak updates
   - Achievement unlocks

4. **Analytics**
   - Event tracking
   - Activity feed
   - Performance metrics

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

## Viral Growth Architecture

### Share System
```
User Action (Complete Problem/Achievement)
  ↓
Generate Share Card (Server-side)
  ↓
Create Deep Link with Unique Code
  ↓
Store in Database (shares table)
  ↓
User Shares Link
  ↓
New User Clicks Link
  ↓
Deep Link Handler Pre-fills Context
  ↓
Track Attribution & Conversion
```

### Referral System
```
User Requests Referral Link
  ↓
Generate Unique Code (UUID)
  ↓
Store in Database (referrals table)
  ↓
User Shares Link
  ↓
New User Signs Up via Link
  ↓
Track Referral & Award Rewards
  ↓
Update Referrer & Referee Accounts
```

### Challenge System
```
User Completes Problem
  ↓
"Challenge Friend" CTA
  ↓
Select Friend & Create Challenge
  ↓
Store in Database (challenges table)
  ↓
Send Notification to Friend
  ↓
Friend Accepts Challenge
  ↓
Friend Completes Problem
  ↓
Award Rewards to Both Users
```

---

## Study Companion Architecture

### Conversation Memory
```
Session Ends
  ↓
Generate Summary (AI)
  ↓
Extract Concepts Covered
  ↓
Store in Database (conversation_summaries)
  ↓
New Session Starts
  ↓
Load Relevant Summaries
  ↓
Include in Context for AI
  ↓
AI References Previous Learning
```

### Goal System
```
User Creates Goal
  ↓
Store in Database (learning_goals)
  ↓
Track Progress on Each Session
  ↓
Goal Completed
  ↓
Suggest Related Subjects
  ↓
Generate Personalized Recommendations
  ↓
User Engages with New Subject
```

### Practice Assignment
```
AI Analyzes Performance
  ↓
Identifies Weak Areas
  ↓
Generates Practice Deck
  ↓
Stores in Database (practice_assignments)
  ↓
User Sees Practice Card
  ↓
Completes Practice Problems
  ↓
Updates Mastery Scores
  ↓
AI Adjusts Future Assignments
```

---

## Database Schema

### New Tables

#### referrals
```sql
CREATE TABLE referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_id UUID REFERENCES auth.users(id),
  referee_id UUID REFERENCES auth.users(id),
  referral_code TEXT UNIQUE,
  status TEXT, -- 'pending', 'completed', 'rewarded'
  reward_given BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### challenges
```sql
CREATE TABLE challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  challenger_id UUID REFERENCES auth.users(id),
  challengee_id UUID REFERENCES auth.users(id),
  problem_id UUID REFERENCES problems(id),
  challenge_type TEXT, -- 'beat_score', 'streak_rescue', 'co_practice'
  status TEXT, -- 'pending', 'accepted', 'completed', 'expired'
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### conversation_summaries
```sql
CREATE TABLE conversation_summaries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  session_id UUID REFERENCES sessions(id),
  summary TEXT,
  concepts_covered TEXT[],
  difficulty_level TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### learning_goals
```sql
CREATE TABLE learning_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  student_profile_id UUID REFERENCES student_profiles(id),
  goal_type TEXT, -- 'subject_mastery', 'exam_prep', 'skill_building'
  target_subject TEXT,
  target_date DATE,
  status TEXT, -- 'active', 'completed', 'paused'
  progress INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### practice_assignments
```sql
CREATE TABLE practice_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  student_profile_id UUID REFERENCES student_profiles(id),
  problem_ids UUID[],
  due_date TIMESTAMP,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### shares
```sql
CREATE TABLE shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  share_type TEXT, -- 'achievement', 'progress', 'problem', 'streak'
  share_code TEXT UNIQUE,
  metadata JSONB,
  click_count INTEGER DEFAULT 0,
  conversion_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);
```

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

