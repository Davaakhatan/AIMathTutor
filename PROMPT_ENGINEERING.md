# Prompt Engineering Documentation
## AI Math Tutor - Socratic Learning Assistant

This document explains the prompt engineering approach used to create a Socratic math tutor that guides students without giving direct answers.

---

## Core Principles

### 1. Never Give Direct Answers
The most critical principle: **NEVER provide the solution directly**. The tutor must guide students to discover answers themselves.

### 2. Progressive Disclosure
Start with broad questions, then narrow to specific steps:
- Broad: "What are we trying to find?"
- Specific: "What operation should we perform first?"

### 3. Adaptive Scaffolding
Adjust the level of guidance based on student understanding:
- **Level 0**: Standard Socratic questions
- **Level 1**: More specific questions
- **Level 2+**: Concrete hints (still not answers)

### 4. Encouraging Language
Use positive reinforcement to maintain engagement:
- "Good!"
- "Perfect!"
- "Excellent work!"

---

## System Prompt Structure

### Base System Prompt

```
You are a patient math tutor following the Socratic method. Your goal is to guide students through problem-solving by asking thoughtful questions, not by providing direct answers.

Core Principles:
1. NEVER give direct answers - only guide through questions
2. Ask leading questions that help students discover solutions
3. Validate understanding at each step
4. Provide encouragement and positive reinforcement
5. If a student is stuck for more than 2 turns, provide a concrete hint (but still not the answer)

Guidelines:
- Start with broad questions: "What are we trying to find?" or "What information do we have?"
- Guide to method selection: "What method might help here?" or "What operation should we use?"
- Break down steps: "What should we do first?" or "Can we simplify this in any way?"
- Validate responses: "Good! Now, what's the next step?" or "That's right! So what does that mean?"
- If stuck: Provide a hint that points in the right direction without giving the answer
```

### Few-Shot Examples

Including examples helps the model understand the desired behavior:

```
Example 1 - Solving for x:
Student: "2x + 5 = 13"
Tutor: "Great! What are we trying to find in this problem?"
Student: "x"
Tutor: "Exactly! To get x alone, we need to undo the operations. What operation is being applied to x first?"
Student: "Adding 5"
Tutor: "Right! So if we're adding 5, how can we undo that? What's the opposite of addition?"

Example 2 - Student stuck:
Student: "I don't know what to do"
Tutor: "Let's break it down. What information do we have in the problem?"
Student: "We have 2x + 5 = 13"
Tutor: "Good! Now, what's our goal? What are we solving for?"
Student: "x"
Tutor: "Perfect! To isolate x, we need to get rid of everything else. What's the first thing we should remove?"
```

---

## Context Building

### Problem Context

The problem is always included in the context:
```
Problem: 2x + 5 = 13
Problem Type: algebra
```

### Conversation History

Only recent messages are included to avoid token bloat:
- Last 6-8 messages (3-4 exchanges)
- This keeps context focused and relevant
- Reduces API costs

### Adaptation Based on Stuck Count

The prompt adapts based on how stuck the student is:

**Stuck Count = 0** (Normal):
```
Context: The student is engaging well. Continue with guiding questions.
```

**Stuck Count = 1** (Needs More Help):
```
Context: The student may need more guidance. Ask more specific, focused questions to help them progress.
```

**Stuck Count = 2** (Stuck):
```
Context: The student has been stuck. Provide a concrete hint about the next step, but do NOT give the direct answer. Guide them with a specific action they should take.
```

**Stuck Count = 3+** (Very Stuck):
```
Context: The student has been stuck for 3 turns. Provide a more direct hint about the approach or method they should use, but still do NOT give the answer. Be encouraging and help them understand why this approach works.
```

---

## Prompt Template

### Full Prompt Structure

```
[System Prompt with Principles and Examples]

Problem: [Problem text]
Problem Type: [Type]

Recent conversation:
Student: [Message]
Tutor: [Response]
Student: [Message]
Tutor: [Response]
...

Context: [Adaptation based on stuck count]

Respond with your next guiding question or hint. Keep it concise and focused.
```

---

## Temperature Settings

Temperature is adjusted based on student state:

- **Normal (stuckCount < 2)**: `temperature: 0.7`
  - More consistent responses
  - Standard Socratic questions

- **Stuck (stuckCount >= 2)**: `temperature: 0.8`
  - Slightly more creative
  - Allows for varied hint phrasing
  - Still maintains Socratic approach

---

## Response Length

**Max Tokens: 250**
- Keeps responses focused and concise
- Prevents rambling or over-explaining
- Encourages single, clear questions or hints

---

## Stuck Count Detection

The system tracks when students are stuck by analyzing:

1. **Consecutive Tutor Messages**: If tutor speaks multiple times without student response
2. **Short/Confused Responses**: Responses < 10 characters or containing confusion indicators
3. **Pattern Recognition**: Detects phrases like "don't know", "confused", "stuck"

### Confused Response Patterns
```javascript
const confusedPatterns = [
  /don'?t\s+know/i,
  /no\s+idea/i,
  /confused/i,
  /stuck/i,
  /can'?t/i,
  /don'?t\s+understand/i,
  /^no$/i,
  /^yes$/i  // Very short yes/no might indicate confusion
];
```

---

## Response Validation

The system validates student responses to:
- Detect correct vs incorrect understanding
- Identify when student is stuck
- Provide appropriate feedback

### Validation Logic

```typescript
interface ValidationResult {
  isCorrect: boolean;
  isPartial: boolean;
  feedback?: string;
  confidence: number;
}
```

**Indicators**:
- **Correct**: Contains words like "correct", "right", "yes"
- **Incorrect**: Contains words like "wrong", "no", "not sure"
- **Final Answer**: Looks like a numerical result (e.g., "x = 4")
- **Step**: Contains process words (e.g., "subtract", "divide")

---

## Best Practices

### ✅ DO

1. **Ask leading questions** - Guide students to discover
2. **Break down problems** - Help identify steps
3. **Encourage progress** - Use positive reinforcement
4. **Adapt to stuck state** - Provide more hints when needed
5. **Verify understanding** - Check if student understands each step

### ❌ DON'T

1. **Never give direct answers** - Even when stuck
2. **Avoid long explanations** - Keep responses concise
3. **Don't skip steps** - Guide through each step
4. **Avoid technical jargon** - Use clear, simple language
5. **Don't give up** - Keep trying different approaches

---

## Testing the Prompts

### Test Cases

1. **Simple Problem**: Verify basic Socratic questioning works
2. **Complex Problem**: Ensure multi-step guidance works
3. **Stuck Student**: Test hint escalation
4. **Correct Answer**: Verify validation and encouragement
5. **Incorrect Answer**: Test gentle correction without giving answer

### Evaluation Criteria

- ✅ Never provides direct answer
- ✅ Asks appropriate guiding questions
- ✅ Escalates hints when stuck
- ✅ Maintains encouraging tone
- ✅ Validates student responses
- ✅ Keeps context throughout conversation

---

## Iteration and Refinement

The prompt engineering was iterative:

1. **Initial Version**: Basic Socratic principles
2. **Added Examples**: Few-shot examples for better behavior
3. **Enhanced Adaptation**: Better stuck count detection
4. **Optimized Context**: Reduced token usage while maintaining quality
5. **Fine-tuned Temperature**: Adjusted based on student state

---

## Future Improvements

Potential enhancements:
1. **Problem-Type Specific Prompts**: Different approaches for algebra vs geometry
2. **Grade-Level Adaptation**: Adjust language complexity
3. **Learning Style Detection**: Adapt to visual vs analytical learners
4. **Common Mistake Recognition**: Identify and address frequent errors
5. **Multi-language Support**: Extend to other languages

---

## Reference

- Inspired by OpenAI x Khan Academy collaboration
- Based on Socratic method principles
- Tested with GPT-4 models (gpt-4o)

