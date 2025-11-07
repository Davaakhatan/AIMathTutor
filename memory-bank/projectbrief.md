# Project Brief
## AI Math Tutor - Enhanced with Viral Growth & Study Companion

**Date**: November 2025  
**Version**: 2.0  
**Status**: Active Development

---

## Objective

Build an AI tutor that guides students through math problems using Socratic questioning, enhanced with:
1. **Viral Growth Features**: Social learning, challenges, referrals, and sharing
2. **AI Study Companion**: Persistent memory, goal-based learning, adaptive practice

The system accepts problems via screenshot, text, or whiteboard and helps students discover solutions through guided dialogue while encouraging social learning and providing personalized study support.

---

## Success Criteria

- Guides students through 5+ problem types without giving direct answers
- Maintains conversation context throughout the session
- Adapts to student understanding level
- Provides hints when student is stuck (>2 turns)

---

## Core Features (Days 1-5)

### Problem Input
- Text entry with validation
- Image upload with OCR/Vision LLM parsing
- Support for printed and handwritten text

### Socratic Dialogue
- Multi-turn conversation
- Never provides direct answers
- Asks guiding questions
- Validates student responses
- Provides hints when stuck

### Math Rendering
- Display equations properly using LaTeX/KaTeX
- Inline and block math support
- Proper formatting

### Web Interface
- Clean chat UI
- Image upload interface
- Conversation history
- Mobile responsive design

---

## Stretch Features (Days 6-7, Optional)

### High Priority
- Interactive Whiteboard: Shared canvas for visual explanations and diagrams
- Step Visualization: Animated breakdown of solution steps
- Voice Interface: Text-to-speech responses + speech-to-text input

### Nice to Have
- Animated Avatar: 2D/3D tutor character with expressions
- Difficulty Modes: Adjust scaffolding by grade level
- Problem Generation: Create similar practice problems

---

## Socratic Approach

### System Prompt Principles
"You are a patient math tutor. NEVER give direct answers. Guide through questions: 'What information do we have?' 'What method might help?' If stuck >2 turns, provide concrete hint. Use encouraging language."

### Flow
1. Parse problem → Inventory knowns
2. Identify goal → Guide method selection
3. Step through solution → Validate answer

---

## Example Interaction

```
Student: [uploads "2x + 5 = 13"]
Tutor: "What are we trying to find?"
Student: "x"
Tutor: "Right! To get x alone, we need to undo the +5 and ×2. Which should we undo first?"
Student: "the +5?"
Tutor: "Exactly! How do we undo adding 5?"
```

---

## Testing Requirements

Test with:
- Simple arithmetic
- Algebra (linear equations, quadratics)
- Geometry (area, perimeter, angles)
- Word problems
- Multi-step problems

---

## Deliverables

- Deployed App (or local with clear setup)
- GitHub Repo with clean code structure
- Documentation: README with setup, 5+ example problem walkthroughs, prompt engineering notes
- 5-Min Demo Video: Text input, image upload, Socratic dialogue, stretch feature (if built)

---

## Evaluation Criteria

- **Pedagogical Quality (35%)**: Genuine guidance without giving answers
- **Technical Implementation (30%)**: Strong execution, bug free experience, how close to production ready?
- **User Experience (20%)**: Intuitive interface, responsive
- **Innovation (15%)**: Creative stretch features

