# Recommended Project Structure

This document outlines the recommended folder structure for the AI Math Tutor project.

## Directory Structure

```
AITutor/
├── memory-bank/              # Project memory bank (documentation)
│   ├── projectbrief.md
│   ├── productContext.md
│   ├── techContext.md
│   ├── systemPatterns.md
│   ├── activeContext.md
│   └── progress.md
│
├── docs/                     # Additional documentation
│   └── (future docs)
│
├── public/                   # Static assets
│   ├── images/
│   └── icons/
│
├── src/                      # Source code (if using src directory)
│   ├── app/                  # Next.js App Router (if using Next.js)
│   │   ├── api/              # API routes
│   │   │   ├── parse-problem/
│   │   │   ├── chat/
│   │   │   └── session/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   │
│   ├── components/           # React components
│   │   ├── chat/
│   │   │   ├── ChatUI.tsx
│   │   │   ├── Message.tsx
│   │   │   └── MessageInput.tsx
│   │   ├── upload/
│   │   │   └── ImageUpload.tsx
│   │   ├── math/
│   │   │   └── MathRenderer.tsx
│   │   └── ui/               # Reusable UI components
│   │       ├── Button.tsx
│   │       └── Loading.tsx
│   │
│   ├── services/             # Business logic
│   │   ├── problemParser.ts
│   │   ├── dialogueManager.ts
│   │   ├── socraticPromptEngine.ts
│   │   └── contextManager.ts
│   │
│   ├── lib/                  # Utilities and helpers
│   │   ├── openai.ts         # OpenAI client setup
│   │   ├── utils.ts
│   │   └── constants.ts
│   │
│   ├── types/                # TypeScript types
│   │   ├── problem.ts
│   │   ├── message.ts
│   │   └── session.ts
│   │
│   └── hooks/                # Custom React hooks
│       ├── useChat.ts
│       └── useSession.ts
│
├── .cursor/                  # Cursor IDE rules (optional)
│   └── rules/
│
├── .gitignore
├── README.md
├── PRD.md
├── TASKS.md
├── ARCHITECTURE.md
├── package.json
├── tsconfig.json
└── tailwind.config.js        # If using Tailwind
```

## Alternative: Without src/ directory (Next.js)

If you prefer not to use a `src/` directory:

```
AITutor/
├── app/                      # Next.js App Router
│   ├── api/                  # API routes
│   ├── layout.tsx
│   └── page.tsx
│
├── components/               # React components
├── services/                 # Business logic
├── lib/                      # Utilities
├── types/                    # TypeScript types
└── hooks/                    # Custom hooks
```

## Key Files to Create

### Configuration Files
- `package.json` - Dependencies and scripts
- `tsconfig.json` - TypeScript configuration
- `tailwind.config.js` - Tailwind CSS config (if using)
- `next.config.js` - Next.js configuration (if using Next.js)

### Environment Setup
- `.env.local` - Local environment variables (create from .env.example)
  - `OPENAI_API_KEY=your_key_here`
  - `NEXT_PUBLIC_APP_URL=http://localhost:3000`

## Component Organization

### By Feature (Recommended)
```
components/
├── chat/          # Chat-related components
├── upload/        # Upload-related components
├── math/          # Math rendering components
└── ui/            # Shared UI components
```

### By Type (Alternative)
```
components/
├── atoms/         # Basic building blocks
├── molecules/     # Simple combinations
├── organisms/     # Complex components
└── templates/     # Page layouts
```

## Service Layer Organization

```
services/
├── problemParser.ts      # Parse problems from text/image
├── dialogueManager.ts    # Manage conversation flow
├── socraticPromptEngine.ts  # Generate Socratic prompts
├── contextManager.ts     # Manage conversation context
└── openaiClient.ts       # OpenAI API wrapper
```

## API Routes (Next.js)

```
app/api/
├── parse-problem/
│   └── route.ts          # POST - Parse problem
├── chat/
│   └── route.ts          # POST - Send message, get response
├── session/
│   ├── route.ts          # POST - Create session
│   └── [id]/
│       └── route.ts      # GET - Get conversation history
```

## Type Definitions

```
types/
├── problem.ts            # Problem-related types
│   - ParsedProblem
│   - ProblemType
├── message.ts            # Message-related types
│   - Message
│   - MessageRole
├── session.ts            # Session-related types
│   - Session
│   - ConversationContext
└── api.ts                # API request/response types
```

## Best Practices

1. **Separation of Concerns**
   - Components: UI only
   - Services: Business logic
   - Types: Type definitions
   - Utils: Helper functions

2. **Naming Conventions**
   - Components: PascalCase (e.g., `ChatUI.tsx`)
   - Services: camelCase (e.g., `dialogueManager.ts`)
   - Types: PascalCase (e.g., `ParsedProblem`)
   - Hooks: camelCase starting with `use` (e.g., `useChat.ts`)

3. **File Organization**
   - One component per file
   - Co-locate related files
   - Use index files for clean imports

4. **Import Paths**
   - Use absolute imports with path aliases
   - Example: `@/components/chat/ChatUI`

## Next Steps

1. Initialize project (Next.js or React)
2. Set up folder structure
3. Install dependencies
4. Create initial components
5. Set up API routes
6. Implement core features

See [TASKS.md](./TASKS.md) for detailed implementation timeline.

