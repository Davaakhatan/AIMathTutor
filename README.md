# AI Math Tutor - Socratic Learning Assistant

An AI-powered math tutor that guides students through problem-solving using the Socratic method. Students learn by discovering solutions through guided questioning rather than receiving direct answers.

## 📚 Documentation

This project includes comprehensive documentation:

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System architecture and technical design
- **[EXAMPLES.md](./EXAMPLES.md)** - Example walkthroughs demonstrating Socratic dialogue (10+ examples)
- **[PROMPT_ENGINEERING.md](./PROMPT_ENGINEERING.md)** - Prompt engineering approach and Socratic method implementation
- **[TESTING_GUIDE.md](./TESTING_GUIDE.md)** - Comprehensive testing guide for all problem types
- **[VERCEL_SETUP.md](./VERCEL_SETUP.md)** - Quick Vercel deployment guide (fix API key errors)
- **[memory-bank/](./memory-bank/)** - Project memory bank with context and patterns

## 🎯 Project Overview

Build an AI tutor that:
- Accepts math problems via text or image upload
- Engages students in Socratic dialogue to guide learning
- Maintains conversation context throughout the session
- Adapts to student understanding level
- Never provides direct answers, only guidance

## ✨ Core Features

### Phase 1: Core (Days 1-5)
- ✅ Problem Input: Text entry + image upload with OCR/Vision LLM parsing
- ✅ Socratic Dialogue: Multi-turn conversation with guiding questions
- ✅ Math Rendering: Display equations properly (LaTeX/KaTeX)
- ✅ Web Interface: Clean chat UI with conversation history

### Phase 2: Stretch (Days 6-7, Optional)
- 🔄 Interactive Whiteboard: Shared canvas for visual explanations
- 🔄 Step Visualization: Animated breakdown of solution steps
- 🔄 Voice Interface: Text-to-speech + speech-to-text
- 🔄 Animated Avatar: 2D/3D tutor character
- 🔄 Difficulty Modes: Adjust scaffolding by grade level
- 🔄 Problem Generation: Create similar practice problems

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ (recommended: Node.js 20+)
- npm or yarn
- OpenAI API key (get from https://platform.openai.com/api-keys)

### Setup Instructions

1. **Clone or navigate to the project directory**
   ```bash
   cd AITutor
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   # Create .env.local file
   touch .env.local
   ```
   
   Add the following to `.env.local`:
   ```env
   OPENAI_API_KEY=your_openai_api_key_here
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

4. **Run development server**
   ```bash
   npm run dev
   ```

5. **Open in browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

### Building for Production

```bash
# Build the application
npm run build

# Start production server
npm start
```

### Troubleshooting

**Issue: OpenAI API errors**
- Verify your API key is correct in `.env.local`
- Check your OpenAI account has sufficient credits
- Ensure the API key has access to GPT-4 models

**Issue: Image parsing not working**
- Ensure images are in JPG or PNG format
- Check file size is under 10MB
- Verify OpenAI Vision API access

**Issue: Math equations not rendering**
- Check browser console for errors
- Ensure KaTeX CSS is loaded
- Verify LaTeX syntax in responses

## 📖 Example Interaction

```
Student: [uploads "2x + 5 = 13"]
Tutor: "What are we trying to find?"
Student: "x"
Tutor: "Right! To get x alone, we need to undo the +5 and ×2. Which should we undo first?"
Student: "the +5?"
Tutor: "Exactly! How do we undo adding 5?"
```

## 🧪 Testing

Test with these problem types:
- Simple arithmetic
- Algebra (linear equations, quadratics)
- Geometry (area, perimeter, angles)
- Word problems
- Multi-step problems

## 📅 Timeline

- **Day 1**: Image parsing working, can extract problem text
- **Day 2**: Basic chat + LLM integration with hardcoded problem
- **Day 3**: Socratic logic (questions not answers), response validation
- **Day 4**: UI polish + math rendering, tested on 5+ problems
- **Day 5**: Documentation, demo video, deployment
- **Days 6-7**: Stretch features (optional)

## 🏗️ Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed system design.

**Tech Stack**:
- Frontend: Next.js/React, Tailwind CSS, KaTeX
- Backend: Next.js API Routes
- LLM: OpenAI GPT-4 (Vision + Dialogue)
- Deployment: Vercel

## 📝 Socratic Approach

The system follows these principles:
1. **Never give direct answers** - Only guide through questions
2. **Progressive disclosure** - Start broad, narrow to specifics
3. **Adaptive scaffolding** - Increase hints if stuck >2 turns
4. **Encouraging language** - Positive reinforcement throughout

## 🤝 Contributing

This is a project for SuperBuilders. See project documentation for details.

## 📧 Contact

John Chen - john.chen@superbuilders.school

## 📄 License

[Add license information]

---

**Reference**: Inspired by OpenAI x Khan Academy demo: https://www.youtube.com/watch?v=IvXZCocyU_M

