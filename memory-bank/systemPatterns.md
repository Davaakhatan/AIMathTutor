# System Patterns & Architecture

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ Chat UI      │  │ Image Upload │  │ Math Render  │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────┴──────────────────────────────────┐
│                 Backend API Layer                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ Problem      │  │ Dialogue     │  │ Context      │ │
│  │ Parser       │  │ Manager      │  │ Manager      │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────┴──────────────────────────────────┐
│              External Services (OpenAI)                  │
│  ┌──────────────┐  ┌──────────────┐                    │
│  │ Vision API   │  │ GPT-4 API    │                    │
│  │ (OCR)        │  │ (Dialogue)   │                    │
│  └──────────────┘  └──────────────┘                    │
└─────────────────────────────────────────────────────────┘
```

## Key Components

### 1. Problem Parser
**Responsibility**: Extract problem statement from text or image
- Text input: Direct pass-through with validation
- Image input: OCR via Vision API → extract math problem
- Output: Structured problem representation

**Pattern**: Strategy pattern for different input types

### 2. Dialogue Manager
**Responsibility**: Orchestrate Socratic conversation
- Maintains conversation state
- Tracks student understanding level
- Determines when to provide hints vs questions
- Manages conversation flow

**Pattern**: State machine or conversation tree

### 3. Socratic Prompt Engine
**Responsibility**: Generate appropriate questions and hints
- Core system prompt: "You are a patient math tutor. NEVER give direct answers..."
- Adapts based on:
  - Student responses
  - Number of turns stuck
  - Problem complexity
  - Student confidence level

**Pattern**: Prompt engineering with few-shot examples

### 4. Context Manager
**Responsibility**: Maintain conversation history
- Stores message history
- Tracks problem context
- Manages session state
- Provides context to LLM

**Pattern**: In-memory store or session-based storage

### 5. Math Renderer
**Responsibility**: Display equations beautifully
- Parse LaTeX from LLM responses
- Render using KaTeX
- Handle inline and block equations
- Support math notation

**Pattern**: Wrapper component for KaTeX

## Design Patterns in Use

### 1. Strategy Pattern
Different parsing strategies for text vs image input

### 2. State Machine
Conversation states:
- Initial problem analysis
- Questioning phase
- Hint escalation
- Solution validation
- Completion

### 3. Chain of Responsibility
Question flow:
- Broad question → Narrow question → Hint → Validation

### 4. Observer Pattern
UI updates based on conversation state changes

## Component Relationships

```
ChatUI
  ├── uses → ProblemParser (for input)
  ├── uses → DialogueManager (for messages)
  ├── uses → MathRenderer (for equations)
  └── uses → ContextManager (for history)

DialogueManager
  ├── uses → SocraticPromptEngine (for generating questions)
  ├── uses → ContextManager (for history)
  └── calls → OpenAI API (for responses)

ProblemParser
  ├── handles → TextInput (direct)
  └── calls → OpenAI Vision API (for images)
```

## Data Flow

1. **Input Phase**
   ```
   User Input → ProblemParser → Structured Problem → ContextManager
   ```

2. **Conversation Phase**
   ```
   User Message → ContextManager → DialogueManager → 
   SocraticPromptEngine → OpenAI API → Response → 
   ContextManager → MathRenderer → ChatUI
   ```

3. **State Updates**
   ```
   Any Interaction → ContextManager → State Update → 
   UI Re-render → ChatUI
   ```

## Key Technical Decisions

### Prompt Engineering Strategy
- **System Prompt**: Fixed Socratic tutor persona
- **Few-shot Examples**: Include example Q&A pairs
- **Context Injection**: Problem statement + conversation history
- **Temperature**: Lower (0.7) for consistency, higher hints when stuck

### Error Handling Pattern
- **API Failures**: Graceful degradation with user-friendly messages
- **Parsing Errors**: Ask user to clarify or re-upload
- **Invalid Input**: Validate before processing

### State Management Pattern
- **Conversation State**: Array of messages with metadata
- **Problem State**: Current problem context
- **UI State**: Loading, error states

## Scalability Considerations

### Current (MVP)
- Single-user sessions
- In-memory state
- Direct API calls

### Future Enhancements
- Multi-user support (database)
- Session persistence
- Rate limiting
- Caching for common problems

