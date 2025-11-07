# Prompt Engineering Guide
## AI Math Tutor - Socratic Learning Assistant

This document explains the prompt engineering approach used to ensure the AI tutor follows the Socratic method and provides effective guidance without giving direct answers.

---

## Core Principles

### 1. Never Give Direct Answers
The system is explicitly instructed to NEVER provide direct answers. Instead, it must guide students through questions.

### 2. Progressive Disclosure
Start with broad questions and narrow down to specifics:
- **Level 1**: "What are we trying to find?"
- **Level 2**: "What information do we have?"
- **Level 3**: "What method/formula should we use?"
- **Level 4**: "What should we do first?"

### 3. Adaptive Scaffolding
The system adapts its level of guidance based on how stuck the student is:
- **Normal (stuckCount = 0)**: Standard guiding questions
- **Moderate (stuckCount = 1)**: More specific, focused questions
- **Stuck (stuckCount = 2)**: Concrete hints about the next step
- **Very Stuck (stuckCount > 2)**: More direct hints about approach/method

---

## System Prompt Structure

### Base System Prompt

The system prompt includes:

1. **Role Definition**: "You are a patient math tutor following the Socratic method"
2. **Core Principles**: Explicit instructions to never give direct answers
3. **Guidelines**: Specific question patterns to use
4. **Few-Shot Examples**: Example interactions showing the desired behavior

### Example System Prompt

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

---

## Context Building

### Problem Context

The problem context is formatted to include:
- Problem text
- Problem type (if identified)
- Confidence level

**Example**:
```
Problem: 2x + 5 = 13
Problem Type: algebra
```

### Conversation History

The conversation history includes:
- Recent messages (last 6-8 messages to avoid token bloat)
- Role labels (Student/Tutor)
- Message content

**Example**:
```
Recent conversation:
Student: 2x + 5 = 13
Tutor: What are we trying to find?
Student: x
Tutor: Exactly! To get x alone, what operation is being applied first?
```

### Adaptive Context

The system adapts the prompt based on `stuckCount`:

**stuckCount = 0** (Normal):
```
Context: The student is engaging well. Continue with guiding questions.
```

**stuckCount = 1** (Moderate):
```
Context: The student may need more guidance. Ask more specific, focused questions to help them progress.
```

**stuckCount = 2** (Stuck):
```
Context: The student has been stuck. Provide a concrete hint about the next step, but do NOT give the direct answer. Guide them with a specific action they should take.
```

**stuckCount > 2** (Very Stuck):
```
Context: The student has been stuck for {count} turns. Provide a more direct hint about the approach or method they should use, but still do NOT give the answer. Be encouraging and help them understand why this approach works.
```

---

## Few-Shot Examples

The system prompt includes few-shot examples to demonstrate the desired behavior:

### Example 1: Solving for x
```
Student: "2x + 5 = 13"
Tutor: "Great! What are we trying to find in this problem?"
Student: "x"
Tutor: "Exactly! To get x alone, we need to undo the operations. What operation is being applied to x first?"
Student: "Adding 5"
Tutor: "Right! So if we're adding 5, how can we undo that? What's the opposite of addition?"
```

### Example 2: Student Stuck
```
Student: "I don't know what to do"
Tutor: "Let's break it down. What information do we have in the problem?"
Student: "We have 2x + 5 = 13"
Tutor: "Good! Now, what's our goal? What are we solving for?"
Student: "x"
Tutor: "Perfect! To isolate x, we need to get rid of everything else. What's the first thing we should remove?"
```

---

## Response Validation

The system validates responses to ensure they follow Socratic principles:

### Validation Checks

1. **Non-Empty**: Response must not be empty
2. **Minimum Length**: Response must be at least 5 characters
3. **Direct Answer Detection**: Warns if response looks like a direct answer (basic check)
4. **Question Format**: Prefers responses that are questions or guidance

### Example Validation Logic

```typescript
// Check for direct answers (basic pattern matching)
const hasDirectAnswer = /^(the answer is|x equals|x =|solution is|equals)/i.test(tutorResponse);
if (hasDirectAnswer && tutorResponse.length < 50) {
  console.warn("Possible direct answer detected");
}
```

---

## Temperature and Token Settings

### Temperature Settings

Temperature is adjusted based on context:
- **Normal**: 0.7 (creative, natural responses)
- **Stuck**: 0.5 (more focused, direct hints)

### Token Limits

- **Max Tokens**: 250 (keeps responses concise)
- **Context Window**: Last 6-8 messages (to avoid token bloat)

---

## Adaptive Prompting Strategy

### Level 1: Normal Guidance (stuckCount = 0)

**Approach**: Broad, open-ended questions
- "What are we trying to find?"
- "What information do we have?"
- "What method might help here?"

**Goal**: Let student discover the path

### Level 2: Moderate Guidance (stuckCount = 1)

**Approach**: More specific, focused questions
- "Think about what operation we need to undo first"
- "What's the relationship between these numbers?"
- "Can you identify what's happening in this step?"

**Goal**: Guide student with more context

### Level 3: Concrete Hints (stuckCount = 2)

**Approach**: Direct hints about the next step
- "Remember: to undo addition, we subtract"
- "Try isolating the variable by doing the opposite operation"
- "What would happen if we added 5 to both sides?"

**Goal**: Provide concrete guidance without giving the answer

### Level 4: Method Guidance (stuckCount > 2)

**Approach**: Explain the approach/method
- "For this type of problem, we typically work backwards from the operations"
- "The key is to isolate the variable by undoing each operation in reverse order"
- "Let's think about this: what's the last thing that happened to x?"

**Goal**: Help student understand the method

---

## Initial Message Strategy

When a conversation starts, the tutor's first message:

1. **Acknowledges the problem**: "I see you're working on: {problem}"
2. **Sets collaborative tone**: "Let's work through this together!"
3. **Asks first guiding question**: "What are we trying to find or solve in this problem?"

**Example**:
```
I see you're working on: 2x + 5 = 13

Let's work through this together! What are we trying to find or solve in this problem?
```

---

## Stuck Count Calculation

The `stuckCount` is calculated based on conversation history:

1. Track consecutive student messages that show confusion or lack of progress
2. Increment `stuckCount` when:
   - Student says "I don't know" or similar
   - Student gives incorrect answer multiple times
   - Student asks for help
   - Student doesn't respond to guidance

3. Reset `stuckCount` when:
   - Student makes progress
   - Student answers correctly
   - Student shows understanding

---

## Prompt Optimization

### Token Management

1. **Limit History**: Only include last 6-8 messages
2. **Concise Formatting**: Use compact message format
3. **Remove Redundancy**: Don't repeat system prompt unnecessarily

### Context Window Optimization

- Problem context: ~50-100 tokens
- Recent conversation: ~200-300 tokens
- Adaptive context: ~20-50 tokens
- System prompt: ~500 tokens
- **Total**: ~800-1000 tokens per request

---

## Best Practices

### Do's ✅

1. **Start Broad**: Always start with "What are we trying to find?"
2. **Ask Questions**: Frame guidance as questions
3. **Validate Understanding**: Check if student understands before moving on
4. **Encourage**: Use positive reinforcement
5. **Adapt**: Adjust guidance level based on stuckCount
6. **Verify**: Encourage students to check their work

### Don'ts ❌

1. **Never Give Direct Answers**: Even when stuck
2. **Don't Skip Steps**: Guide through each step
3. **Don't Assume**: Ask, don't tell
4. **Don't Be Vague**: Provide concrete hints when needed
5. **Don't Rush**: Be patient with stuck students

---

## Testing the Prompts

### Test Cases

1. **Normal Flow**: Student answers correctly, verify guidance works
2. **Stuck Student**: Student gets stuck, verify hint escalation
3. **Incorrect Answers**: Student gives wrong answer, verify correction guidance
4. **Confused Responses**: Student says "I don't know", verify more specific questions
5. **Off-Topic**: Student goes off-topic, verify redirect to problem

### Validation

After each prompt update:
1. Test with 5+ problem types
2. Verify Socratic method is maintained
3. Check hint escalation works
4. Confirm no direct answers are given
5. Ensure responses are encouraging

---

## Future Improvements

### Potential Enhancements

1. **Problem-Specific Prompts**: Different prompts for different problem types
2. **Learning Style Adaptation**: Adapt to student's learning style
3. **Concept Reinforcement**: Include concept explanations in hints
4. **Error Pattern Recognition**: Recognize common mistakes and address them
5. **Progress Tracking**: Track student progress and adjust difficulty

---

## References

- **Socratic Method**: https://en.wikipedia.org/wiki/Socratic_method
- **OpenAI GPT-4 Documentation**: https://platform.openai.com/docs
- **Prompt Engineering Best Practices**: OpenAI Cookbook

---

**Last Updated**: Current Session  
**Maintained By**: Development Team

