# Active Context
## AI Math Tutor - Socratic Learning Assistant

**Last Updated**: November 2025  
**Status**: Core Features Complete, Phase 1 Development Starting

---

## Current Focus

### Phase 1: Viral Growth & Study Companion (🚧 In Progress)
- [ ] Share cards & deep links
- [ ] Basic referral system
- [ ] Challenge system
- [ ] Enhanced leaderboards
- [ ] Persistent conversation memory
- [ ] Goal-based learning paths
- [ ] Adaptive practice suggestions
- [ ] Re-engagement nudges

### Completed ✅
- Core problem input (text + image)
- Socratic dialogue system
- Math rendering (KaTeX)
- Chat UI with minimalist design
- Error handling and retry logic
- Input validation and sanitization
- Conversation restart functionality
- Mobile responsive design
- API error handling improvements
- Timeout handling for all API calls
- Problem of the Day feature
- XP/Leveling System with gamification
- Sound Effects System (Web Audio API)
- Mobile Optimizations (touch-friendly UI)
- Dark Mode support throughout
- Logic coherence fixes (no duplicate awards, proper tracking)

### Recent Changes
- Added Problem of the Day with deterministic generation
- Implemented XP/Leveling System with progress tracking
- Created Sound Effects System using Web Audio API
- Added MobileOptimizer component for device detection
- Fixed logic coherence issues (duplicate XP prevention, infinite loops)
- Improved mobile touch targets and responsive layouts
- Fixed hydration errors in new components
- Enhanced Settings with sound controls
- Fixed duplicate variable declarations
- Improved audio context resume for user interaction

---

## Current Architecture State

### Frontend Components
- `app/page.tsx` - Main page with problem input and chat
- `components/chat/ChatUI.tsx` - Main chat interface
- `components/chat/Message.tsx` - Individual message display
- `components/chat/MessageInput.tsx` - Message input field
- `components/ProblemInput.tsx` - Problem input (text + image)
- `components/upload/ImageUpload.tsx` - Image upload component
- `components/math/MathRenderer.tsx` - LaTeX math rendering
- `components/ProblemOfTheDay.tsx` - Daily challenge feature
- `components/XPSystem.tsx` - XP and leveling system
- `components/MobileOptimizer.tsx` - Mobile device detection
- `components/stretch/*` - Stretch features (Whiteboard, Voice, etc.)
- `components/*` - Additional features (Settings, History, Dashboard, etc.)

### Backend Services
- `services/problemParser.ts` - Parse problems from text/images
- `services/dialogueManager.ts` - Orchestrate conversations
- `services/contextManager.ts` - Manage session context
- `services/socraticPromptEngine.ts` - Generate Socratic prompts

### API Routes
- `app/api/parse-problem/route.ts` - Parse problem endpoint
- `app/api/chat/route.ts` - Chat message endpoint
- `app/api/session/route.ts` - Session management endpoint

### Utilities
- `lib/openai.ts` - OpenAI client initialization
- `lib/utils.ts` - Utility functions (sanitization, validation, error formatting)
- `lib/soundEffects.ts` - Sound effects manager (Web Audio API)
- `lib/textUtils.ts` - Text normalization utilities

---

## Key Design Decisions

### UI/UX
- **Minimalist Design**: Clean, modern interface without emojis
- **User-Friendly**: Intuitive controls, clear feedback
- **Responsive**: Mobile-first design
- **Accessible**: Proper ARIA labels, keyboard navigation

### Error Handling
- **Retry Logic**: Automatic retries for transient failures
- **Timeout Handling**: 30s for chat, 30s for images, 15s for text
- **User-Friendly Messages**: Clear, actionable error messages
- **Input Validation**: Length limits, sanitization

### Socratic Method
- **Never Direct Answers**: System validates responses aren't direct answers
- **Adaptive Hints**: Escalates hints when stuck >2 turns
- **Encouraging Language**: Positive reinforcement throughout
- **Context Awareness**: Maintains conversation history

---

## Known Issues / Considerations

### Current Limitations
- In-memory session storage (sessions lost on server restart)
- No persistent conversation history
- No user authentication
- No rate limiting (relies on OpenAI rate limits)

### Future Enhancements (Phase 2+)
- Advanced viral loops (watch parties, clubs)
- Tutor advocacy system
- Multi-touch attribution
- Advanced analytics dashboard
- A/B testing framework
- Push notifications
- SMS integration
- Advanced personalization

---

## Development Environment

### Running Locally
- Port: 3002 (3000, 3001, 5173 were in use)
- Command: `npm run dev` or `npm run dev:3002`
- Environment: `.env.local` with `OPENAI_API_KEY`

### Deployment
- Platform: Vercel
- Connected via GitHub
- Environment variables in Vercel dashboard
- See `VERCEL_SETUP.md` for detailed instructions

---

## Next Steps (Optional)

1. **Demo Video**: Create 5-minute walkthrough
2. **Stretch Features**: Implement whiteboard, voice, or other enhancements
3. **Testing**: Test with more problem types
4. **Documentation**: Update if needed based on usage

---

## Important Notes

- **API Key**: Must be set in `.env.local` (local) or Vercel dashboard (production)
- **Error Messages**: Different messages for development vs production
- **Port**: Use port 3002 if 3000/3001 are in use
- **Syntax**: Fixed syntax error in ChatUI.tsx (finally block now properly associated with try)

---

## Code Quality

- TypeScript throughout
- Proper error handling
- Input validation and sanitization
- Retry logic for resilience
- Timeout handling
- User-friendly error messages
- Clean component structure

---

## Testing Status

- ✅ Text input working
- ✅ Image upload working
- ✅ Chat conversation working
- ✅ Math rendering working
- ✅ Error handling working
- ✅ Retry logic working
- ✅ Mobile responsive working
- ⏳ More problem types to test
- ⏳ Edge cases to test

