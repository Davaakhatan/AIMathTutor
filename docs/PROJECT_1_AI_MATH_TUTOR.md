# Project 1: AI Math Tutor
## Socratic Learning Assistant

**Project Type**: Core Educational Platform  
**Timeline**: 3-5 Days Core + Optional Stretch Features  
**Date**: November 3, 2025  
**Status**: ✅ **COMPLETE**  
**Contact**: John Chen (john.chen@superbuilders.school)

---

## Executive Summary

Build an AI tutor that guides students through math problems using **Socratic questioning** (like the OpenAI x Khan Academy demo: https://www.youtube.com/watch?v=IvXZCocyU_M). System accepts problems via screenshot or text and helps students discover solutions through guided dialogue.

---

## Objective

Create an AI-powered math tutor that:
- Accepts problems via **screenshot or text**
- Guides students through **Socratic dialogue**
- Helps students **discover solutions** through guided questioning
- Never gives direct answers, only guidance
- Maintains conversation context
- Adapts to student understanding level

---

## Success Criteria

### Primary Goals
- ✅ Guides students through **5+ problem types** without giving direct answers
- ✅ Maintains **conversation context** throughout the session
- ✅ **Adapts to student understanding level** (beginner, intermediate, advanced)

### Evaluation Criteria
- **Pedagogical Quality (35%)**: Genuine guidance without giving answers
- **Technical Implementation (30%)**: Strong execution, bug-free experience, how close to production ready?
- **User Experience (20%)**: Intuitive interface, responsive
- **Innovation (15%)**: Creative stretch features

---

## Core Features (Days 1-5)

### 1. Problem Input

**Text Entry**
- Input field with validation
- Support for mathematical notation
- Problem type detection

**Image Upload**
- Screenshot/image upload interface
- OCR/Vision LLM parsing
- Support for printed and handwritten text
- Automatic problem extraction from images

### 2. Socratic Dialogue

**Core Principles**
- **NEVER give direct answers**
- Ask guiding questions: "What information do we have?", "What method might help?"
- Validate student responses
- Provide hints when stuck (>2 turns)
- Use encouraging language

**System Prompt**
```
"You are a patient math tutor. NEVER give direct answers. Guide through questions: 
'What information do we have?' 'What method might help?' If stuck >2 turns, provide 
concrete hint. Use encouraging language."
```

**Conversation Flow**
1. Parse problem → Inventory knowns
2. Identify goal → Guide method selection
3. Step through solution → Validate answer
4. Provide hints if stuck → Escalate gradually

**Multi-Turn Conversation**
- Maintains context across turns
- Tracks student progress
- Adapts difficulty based on responses
- Validates answers without revealing solutions

### 3. Math Rendering

**LaTeX/KaTeX Integration**
- Display equations properly
- Inline math support: `$x^2 + 5 = 13$`
- Block math support: `$$\int_0^1 x dx$$`
- Proper formatting and alignment
- Mobile-responsive rendering

### 4. Web Interface

**Chat UI**
- Clean, minimalist design
- Message bubbles (user/tutor)
- Math rendering in messages
- Conversation history
- Mobile-responsive layout

**Problem Input UI**
- Text input field
- Image upload area (drag-and-drop)
- Problem type indicator
- Error handling

---

## Stretch Features (If Time Permits)

### High Value

**Interactive Whiteboard**
- Shared canvas for visual explanations and diagrams
- Drawing tools (pen, shapes, eraser)
- Export/import functionality
- Real-time collaboration (future)

**Step Visualization**
- Animated breakdown of solution steps
- Visual representation of problem-solving process
- Highlight key concepts
- Progress indicators

**Voice Interface**
- Text-to-speech for tutor responses
- Speech-to-text for student input
- Accessibility improvements
- Hands-free interaction

### Polish

**Animated Avatar**
- 2D/3D tutor character
- Expressions and gestures
- Visual feedback for encouragement
- Personality and warmth

**Difficulty Modes**
- Adjust scaffolding by grade level
- Beginner: More hints, simpler language
- Advanced: Less guidance, complex problems
- Adaptive difficulty based on performance

**Problem Generation**
- Create similar practice problems
- Vary difficulty and complexity
- Generate follow-up questions
- Spaced repetition support

**Note**: These are simply guidelines. You are free to be creative and add features that YOU feel would make this experience amazing or delightful.

---

## Socratic Approach

### System Prompt Principles

**Core Prompt**
"You are a patient math tutor. NEVER give direct answers. Guide through questions: 'What information do we have?' 'What method might help?' If stuck >2 turns, provide concrete hint. Use encouraging language."

### Conversation Flow

1. **Parse problem** → Inventory knowns
2. **Identify goal** → Guide method selection
3. **Step through solution** → Validate answer
4. **Provide hints if stuck** → Escalate gradually

### Example Interaction

```
Student: [uploads "2x + 5 = 13"]

Tutor: "What are we trying to find?"

Student: "x"

Tutor: "Right! To get x alone, we need to undo the +5 and ×2. Which should we undo first?"

Student: "the +5?"

Tutor: "Exactly! How do we undo adding 5?"

Student: "Subtract 5?"

Tutor: "Perfect! So if we subtract 5 from both sides, what do we get?"

Student: "2x = 8"

Tutor: "Great! Now we have 2x = 8. What's the next step to get x alone?"

Student: "Divide by 2?"

Tutor: "Excellent! So x = ?"

Student: "x = 4"

Tutor: "Perfect! You solved it step by step. Great work!"
```

---

## Example Timeline

### Day 1: Image Parsing
- Image parsing working
- Can extract problem text from images
- OCR/Vision LLM integration
- Support for printed text (easier than handwritten)

### Day 2: Basic Chat + LLM
- Basic chat interface
- LLM integration with hardcoded problem
- Validate Socratic prompting works before building full UI
- Test dialogue flow

### Day 3: Socratic Logic
- Questions not answers
- Response validation
- Hint escalation logic
- Context management

### Day 4: UI Polish + Math Rendering
- UI polish
- Math rendering (LaTeX/KaTeX)
- Tested on 5+ problems
- Mobile responsive

### Day 5: Documentation & Deployment
- Documentation
- Demo video
- Deployment
- README with setup instructions

### Day 6-7 (Optional): Stretch Features
- Whiteboard (highest priority for impact)
- Voice interface
- Avatar
- Other creative features

---

## Testing Requirements

### Problem Types to Test
- ✅ **Simple arithmetic**: Addition, subtraction, multiplication, division
- ✅ **Algebra**: Linear equations, quadratics, systems of equations
- ✅ **Geometry**: Area, perimeter, angles, Pythagorean theorem
- ✅ **Word problems**: Multi-step, real-world scenarios
- ✅ **Multi-step problems**: Combining multiple concepts

### Test Scenarios
- New user flow (first problem)
- Returning user (conversation history)
- Stuck student (hint escalation)
- Advanced student (minimal guidance)
- Error handling (invalid input, API failures)

---

## Deliverables

### Code
- ✅ Deployed app (Vercel or local with clear setup)
- ✅ GitHub repository with clean code structure
- ✅ Production-ready codebase
- ✅ Error handling and edge cases

### Documentation
- ✅ **README.md**: Setup instructions, quick start guide
- ✅ **5+ Example Problem Walkthroughs**: Detailed examples showing Socratic dialogue
- ✅ **Prompt Engineering Notes**: Approach, methodology, iterations
- ✅ **Architecture Documentation**: Technical design and decisions

### Demo
- ✅ **5-Minute Demo Video** showing:
  - Text input example
  - Image upload example
  - Socratic dialogue in action
  - Stretch feature (if built)

---

## Quick Start Guide

### Day 1 Strategy
1. Build basic chat with hardcoded problem + LLM
2. Validate Socratic prompting works before building full UI
3. Start image parsing with printed text (easier than handwritten)

### Stretch Priority
1. **Whiteboard** > Voice > Avatar (for maximum impact)
2. Focus on features that enhance the core experience
3. Be creative - add features that make the experience amazing or delightful

---

## Technical Requirements

### Technology Stack
- **Frontend**: Next.js 14 (App Router), React, TypeScript
- **Styling**: Tailwind CSS
- **AI**: OpenAI GPT-4 (chat), GPT-4 Vision (image parsing)
- **Math Rendering**: KaTeX
- **Deployment**: Vercel
- **Database**: Supabase (for session storage)

### API Integration
- OpenAI GPT-4 API for dialogue
- OpenAI Vision API for image parsing
- Streaming responses for real-time feedback

### Performance Requirements
- Response time: < 3 seconds for chat
- Image parsing: < 5 seconds
- Mobile-responsive: Works on all screen sizes
- Offline capability: PWA support

---

## Current Status

### ✅ Completed (100%)
- Core AI tutoring with Socratic method
- Problem input (text, image, whiteboard)
- Chat-based dialogue system
- Math rendering (LaTeX/KaTeX)
- Mobile-responsive design
- XP/Gamification system
- User authentication (Supabase)
- Student profiles (Model B)
- PWA support
- Persistent session storage
- Learning dashboard & analytics
- Concept tracking & mastery
- Difficulty tracking & recommendations

### Architecture Highlights
- Clean component structure
- Modular service layer
- Context management for conversations
- Error recovery UI
- Streaming responses
- Logger utility for debugging

---

## Key Learnings

### What Worked Well
- ✅ Socratic method prompt engineering
- ✅ Streaming responses for better UX
- ✅ Modular architecture
- ✅ Comprehensive error handling

### Challenges Overcome
- ✅ Hydration warnings (SSR/CSR)
- ✅ Math rendering in chat
- ✅ Image parsing accuracy
- ✅ Context management across sessions

---

## Foundation for Other Projects

This project provides the **solid foundation** for:
- **K Factor Project**: Core tutoring experience to share/refer
- **Study Companion**: Conversation data for memory/analytics
- **Future Features**: Extensible architecture

**Status**: ✅ **PRODUCTION READY** - Core features complete and tested.

---

## Contact

**John Chen**  
john.chen@superbuilders.school
