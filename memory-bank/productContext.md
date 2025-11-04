# Product Context: AI Math Tutor

## Why This Project Exists
Traditional math tutoring often provides direct answers, which can hinder deep understanding. Students learn better when they discover solutions through guided questioning—the Socratic method. This project addresses the need for scalable, personalized math tutoring that promotes genuine learning.

## Problems It Solves
1. **Limited Access to Quality Tutoring**: Not all students have access to skilled tutors who use effective pedagogical methods
2. **Passive Learning**: Direct answers create dependency rather than understanding
3. **Lack of Personalized Pace**: Students learn at different speeds and need adaptive scaffolding
4. **Problem Input Friction**: Students should be able to input problems naturally (text or image)

## How It Should Work

### User Journey
1. **Problem Input**: Student enters problem via text or uploads image
2. **Problem Parsing**: System extracts problem statement and context
3. **Initial Assessment**: Tutor identifies what the student needs to find
4. **Guided Discovery**: Tutor asks leading questions to help student think through solution
5. **Validation**: Tutor confirms understanding at each step
6. **Completion**: Student reaches solution independently

### Core Interaction Pattern
```
Student: [uploads "2x + 5 = 13"]
Tutor: "What are we trying to find?"
Student: "x"
Tutor: "Right! To get x alone, we need to undo the +5 and ×2. Which should we undo first?"
Student: "the +5?"
Tutor: "Exactly! How do we undo adding 5?"
```

## User Experience Goals

### Primary Goals
- **Intuitive**: Minimal learning curve, familiar chat interface
- **Responsive**: Fast feedback, clear math rendering
- **Encouraging**: Positive reinforcement, patient guidance
- **Educational**: Promotes understanding over quick answers

### Key UX Principles
1. **Never Break Character**: Always maintain Socratic tutor persona
2. **Progressive Disclosure**: Start with broad questions, narrow to specifics
3. **Adaptive Scaffolding**: Increase hints if student is stuck >2 turns
4. **Visual Clarity**: Math equations rendered beautifully and clearly
5. **Context Preservation**: Remember conversation history throughout session

## Target Users
- Middle and high school students (primary)
- Students needing homework help
- Learners preparing for exams
- Self-directed learners

## Success Metrics
- Student completes problems without direct answers
- Student demonstrates understanding through responses
- Conversation feels natural and helpful
- Problems are correctly parsed and understood

