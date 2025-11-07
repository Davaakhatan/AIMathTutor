# Technical Context
## AI Math Tutor - Socratic Learning Assistant

---

## Technology Stack

### Frontend
- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Math Rendering**: KaTeX
- **File Upload**: react-dropzone
- **State Management**: React hooks (useState, useEffect, Context API)
- **Authentication**: Supabase Auth
- **Database Client**: Supabase JS

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Next.js API Routes
- **LLM Integration**: OpenAI SDK (GPT-4o)
- **Vision API**: OpenAI GPT-4 Vision
- **Database**: Supabase (PostgreSQL)
- **Session Storage**: Supabase (sessions table)
- **Authentication**: Supabase Auth

### Development Tools
- **Package Manager**: npm
- **Linting**: ESLint
- **Version Control**: Git
- **Deployment**: Vercel

---

## Key Technical Constraints

### API Limitations
- OpenAI API rate limits
- Token usage costs
- Context window limits (GPT-4)
- Vision API file size limits (20MB)

### Performance Requirements
- Fast response times (<3s for chat)
- Image parsing (<10s)
- Smooth UI interactions
- Mobile optimization

### Security Requirements
- API keys never exposed to frontend
- Input sanitization
- File upload validation
- Error handling without exposing internals

---

## Architecture Decisions

### Why Next.js?
- Server-side API routes for secure API key handling
- Built-in optimizations
- Easy deployment to Vercel
- TypeScript support

### Why KaTeX?
- Fast math rendering
- Lightweight
- Good browser support
- Easy integration

### Why In-Memory Sessions?
- MVP simplicity
- Fast development
- Sufficient for initial launch
- Can migrate to Redis later

---

## API Integration

### OpenAI GPT-4
- **Model**: `gpt-4o` (or `gpt-4` if needed)
- **Vision Model**: `gpt-4o` for image parsing
- **Temperature**: Adaptive (0.7 normal, 0.5 when stuck)
- **Max Tokens**: 250 (keeps responses concise)

### API Endpoints
- `/api/parse-problem` - Parse text or image
- `/api/chat` - Send message, get tutor response
- `/api/session` - Create new session

---

## Environment Variables

### Required
- `OPENAI_API_KEY` - OpenAI API key

### Optional
- `NEXT_PUBLIC_APP_URL` - Application URL
- `NODE_ENV` - Environment (development/production)

---

## File Structure

```
AITutor/
├── app/
│   ├── api/
│   │   ├── chat/
│   │   ├── parse-problem/
│   │   └── session/
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── chat/
│   ├── math/
│   └── upload/
├── lib/
│   ├── openai.ts
│   └── utils.ts
├── services/
│   ├── contextManager.ts
│   ├── dialogueManager.ts
│   ├── problemParser.ts
│   └── socraticPromptEngine.ts
├── types/
│   └── index.ts
└── memory-bank/
```

---

## Error Handling Strategy

### Frontend
- User-friendly error messages
- Retry logic for transient failures
- Timeout handling
- Loading states

### Backend
- Try-catch blocks for all API calls
- Specific error messages
- Proper HTTP status codes
- Logging for debugging

---

## Performance Optimizations

### Frontend
- Code splitting
- Lazy loading
- Memoization where needed
- Optimized re-renders

### Backend
- Efficient prompt construction
- Context window optimization
- Response caching (future)
- Rate limiting (future)

---

## Deployment Considerations

### Vercel
- Serverless functions
- Automatic scaling
- Edge network
- Environment variables in dashboard

### Build Process
- TypeScript compilation
- Next.js optimization
- Static asset generation
- API route compilation

---

## Future Technical Enhancements

### Scalability
- ✅ Database for persistent history (Supabase)
- ✅ Session storage in database (Supabase)
- Queue system for high load (future)
- CDN for static assets (Vercel Edge)

### Features
- ✅ Streaming responses
- ✅ Progressive Web App (PWA)
- ✅ Offline support (Service Worker)
- WebSocket for real-time updates (future)
- Background jobs for re-engagement (future)

### New Features (Phase 1)
- Viral growth system (share, referral, challenge)
- AI Study Companion (memory, goals, practice)
- Enhanced analytics
- Real-time leaderboards

---

## Development Workflow

1. Local development with `.env.local`
2. Test on multiple problem types
3. Verify Socratic method compliance
4. Check mobile responsiveness
5. Deploy to Vercel
6. Monitor API usage and costs

---

## Testing Strategy

### Manual Testing
- 5+ problem types
- Various user scenarios
- Error cases
- Edge cases

### Automated Testing (Future)
- Unit tests for services
- Integration tests for API routes
- Component tests
- E2E tests

