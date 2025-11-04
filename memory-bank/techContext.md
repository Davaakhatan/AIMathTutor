# Technical Context

## Technology Stack

### Frontend
- **Framework**: React/Next.js (recommended for clean UI and deployment)
- **Math Rendering**: KaTeX or MathJax for LaTeX equations
- **UI Components**: Tailwind CSS or Material-UI for modern interface
- **Image Handling**: File upload with preview

### Backend
- **API Framework**: Next.js API routes or Express.js
- **LLM Integration**: OpenAI API (GPT-4 Vision for image parsing, GPT-4 for dialogue)
- **OCR/Vision**: OpenAI Vision API for image-to-text conversion
- **Session Management**: In-memory or Redis for conversation context

### Development Tools
- **TypeScript**: For type safety
- **Package Manager**: npm or yarn
- **Version Control**: Git
- **Deployment**: Vercel (for Next.js) or similar platform

## Technical Constraints

### Image Processing
- Start with printed text (easier OCR accuracy)
- Handwritten text can be stretch feature
- Support common formats: PNG, JPG, JPEG

### LLM Requirements
- **Vision Model**: GPT-4 Vision for image parsing
- **Dialogue Model**: GPT-4 for Socratic conversation
- **Context Window**: Must maintain conversation history
- **Rate Limiting**: Handle API limits gracefully

### Performance Requirements
- Response time: <3 seconds for typical interactions
- Math rendering: Instant display
- Image upload: Handle files up to 10MB

## Development Setup

### Prerequisites
- Node.js 18+ 
- npm or yarn
- OpenAI API key
- Modern web browser

### Environment Variables
```
OPENAI_API_KEY=your_api_key_here
NEXT_PUBLIC_APP_URL=http://localhost:3000 (development)
```

## Dependencies (Expected)

### Core
- `openai` - OpenAI API client
- `katex` or `react-katex` - Math rendering
- `react-dropzone` or similar - Image upload
- `zustand` or `react-context` - State management

### Development
- `typescript` - Type safety
- `eslint` - Code quality
- `prettier` - Code formatting

## Technical Decisions Needed

1. **State Management**: Context API vs Zustand vs Redux
2. **Image Storage**: Local processing vs cloud storage
3. **Conversation Persistence**: In-memory vs database
4. **Deployment Platform**: Vercel vs Netlify vs custom
5. **Error Handling**: User-friendly error messages

## Architecture Considerations

- **Modular Design**: Separate concerns (parsing, dialogue, rendering)
- **Error Resilience**: Graceful degradation if API fails
- **Scalability**: Consider future multi-user support
- **Security**: Protect API keys, validate inputs

