# Testing Guide
## AI Math Tutor - Socratic Learning Assistant

This guide provides comprehensive testing instructions to ensure the AI tutor works correctly across all problem types and scenarios.

---

## Quick Test Checklist

### ✅ Core Functionality
- [ ] Text input parsing works
- [ ] Image upload parsing works
- [ ] Chat conversation initializes
- [ ] Messages send and receive correctly
- [ ] Math equations render properly
- [ ] Error handling works
- [ ] Retry logic works
- [ ] Mobile responsive design works

### ✅ Problem Types
- [ ] Simple arithmetic
- [ ] Linear algebra equations
- [ ] Quadratic equations
- [ ] Geometry (area, perimeter, angles)
- [ ] Simple word problems
- [ ] Complex word problems (percentages, multi-variable)
- [ ] Multi-step problems

### ✅ Socratic Method
- [ ] Tutor never gives direct answers
- [ ] Tutor asks guiding questions
- [ ] Hint escalation works when stuck
- [ ] Conversation context is maintained
- [ ] Encouragement is provided

---

## Detailed Testing Scenarios

### 1. Text Input Testing

**Test Case 1: Simple Text Input**
1. Enter problem: `2x + 5 = 13`
2. Submit
3. Verify: Problem is parsed correctly
4. Verify: Conversation starts with tutor's first question
5. Verify: Problem type is identified as "algebra"

**Test Case 2: Long Text Input**
1. Enter problem with >500 characters
2. Submit
3. Verify: Error message appears (text too long)
4. Verify: Problem is not submitted

**Test Case 3: Empty Input**
1. Leave input empty
2. Submit
3. Verify: Error message appears
4. Verify: Problem is not submitted

**Test Case 4: Special Characters**
1. Enter problem with LaTeX: `$x^2 + 5x + 6 = 0$`
2. Submit
3. Verify: Problem is parsed correctly
4. Verify: Math renders in conversation

---

### 2. Image Upload Testing

**Test Case 1: Valid Image Upload**
1. Upload image with math problem
2. Verify: Image preview appears
3. Verify: Processing indicator shows
4. Verify: Problem is parsed correctly
5. Verify: Conversation starts

**Test Case 2: Large Image**
1. Upload image >10MB
2. Verify: Error message appears
3. Verify: Image is not processed

**Test Case 3: Invalid File Type**
1. Upload non-image file (e.g., .pdf)
2. Verify: Error message appears
3. Verify: File is rejected

**Test Case 4: Handwritten vs Printed**
1. Upload image with handwritten problem
2. Verify: Problem is parsed (may have lower confidence)
3. Upload image with printed problem
4. Verify: Problem is parsed with higher confidence

---

### 3. Conversation Flow Testing

**Test Case 1: Normal Flow**
1. Enter problem: `2x + 5 = 13`
2. Respond to tutor's questions
3. Verify: Tutor asks guiding questions
4. Verify: Tutor never gives direct answer
5. Verify: Tutor validates understanding
6. Verify: Conversation maintains context

**Test Case 2: Student Gets Stuck**
1. Enter problem
2. Respond with "I don't know" multiple times
3. Verify: Tutor provides more specific questions
4. Verify: After 2+ stuck turns, tutor provides concrete hints
5. Verify: Hints still don't give direct answer

**Test Case 3: Incorrect Answers**
1. Enter problem
2. Give incorrect answer
3. Verify: Tutor gently corrects without giving answer
4. Verify: Tutor guides to correct understanding
5. Verify: Encouragement is provided

**Test Case 4: Multi-Turn Conversation**
1. Enter problem
2. Have 5+ message exchanges
3. Verify: Context is maintained throughout
4. Verify: Tutor references previous responses
5. Verify: Conversation flows naturally

---

### 4. Problem Type Testing

#### Arithmetic Problems

**Test Problems**:
- `15 + 27`
- `8 × 4 - 12`
- `100 ÷ 5 + 10`

**What to Verify**:
- Problem type identified as "arithmetic"
- Tutor guides through calculation steps
- No direct answers given

#### Linear Algebra

**Test Problems**:
- `2x + 5 = 13`
- `3x - 7 = 14`
- `5x + 3 = 2x + 15`

**What to Verify**:
- Problem type identified as "algebra"
- Tutor guides through inverse operations
- Tutor helps identify operations applied to variable
- Solution is discovered through questions

#### Quadratic Equations

**Test Problems**:
- `x² + 5x + 6 = 0`
- `x² - 9 = 0`
- `2x² + 7x + 3 = 0`

**What to Verify**:
- Problem type identified as "algebra"
- Tutor asks about method (factoring, quadratic formula)
- Tutor guides through factoring process
- Tutor helps verify both solutions

#### Geometry - Area

**Test Problems**:
- "Find the area of a circle with radius 5"
- "What's the area of a rectangle that's 10 by 5?"
- "Calculate the area of a triangle with base 8 and height 6"

**What to Verify**:
- Problem type identified as "geometry"
- Tutor asks about formula
- Tutor guides through substitution
- Tutor helps with calculation

#### Geometry - Perimeter

**Test Problems**:
- "Find the perimeter of a rectangle that is 10 units long and 5 units wide"
- "What's the perimeter of a square with side length 7?"

**What to Verify**:
- Problem type identified as "geometry"
- Tutor guides through formula application
- Tutor helps with step-by-step calculation

#### Geometry - Angles

**Test Problems**:
- "In a triangle, two angles are 30° and 60°. What's the measure of the third angle?"
- "If one angle of a right triangle is 45°, what's the other angle?"

**What to Verify**:
- Problem type identified as "geometry"
- Tutor asks about triangle angle sum property
- Tutor guides through equation setup
- Tutor helps solve for unknown

#### Word Problems - Simple

**Test Problems**:
- "Sarah drives 60 miles per hour. How long does it take her to drive 180 miles?"
- "A store has 50 apples. If they sell 15, how many are left?"

**What to Verify**:
- Problem type identified as "word_problem"
- Tutor helps identify given information
- Tutor guides through formula/equation setup
- Tutor helps solve

#### Word Problems - Complex (Percentages)

**Test Problems**:
- "A store has a 20% off sale. If an item originally costs $50, what's the sale price?"
- "If a shirt costs $40 and the price increases by 15%, what's the new price?"

**What to Verify**:
- Problem type identified as "word_problem"
- Tutor helps understand percentage concept
- Tutor guides through percentage calculation
- Tutor verifies answer makes sense

#### Word Problems - Multi-Variable

**Test Problems**:
- "Sarah has twice as many apples as John. Together they have 12 apples. How many apples does each have?"
- "The sum of two numbers is 20. One number is 3 times the other. What are the numbers?"

**What to Verify**:
- Problem type identified as "word_problem"
- Tutor helps define variables
- Tutor guides through relationship setup
- Tutor helps set up and solve equation

#### Multi-Step Problems

**Test Problems**:
- `2(x + 3) - 5 = 11`
- `3x + 2 = 2x + 8`
- `5(x - 2) + 3 = 18`

**What to Verify**:
- Problem type identified as "multi_step"
- Tutor breaks down into steps
- Tutor guides through each step
- Tutor helps verify final answer

---

### 5. Error Handling Testing

**Test Case 1: Network Error**
1. Disconnect internet
2. Send message
3. Verify: Error message appears
4. Verify: Retry option works
5. Reconnect internet
6. Verify: Retry succeeds

**Test Case 2: API Timeout**
1. Send message during slow network
2. Verify: Timeout error appears after 30 seconds
3. Verify: Error message is user-friendly
4. Verify: Retry option works

**Test Case 3: API Key Error**
1. Remove/invalidate API key
2. Send message
3. Verify: Error message about API key appears
4. Verify: Message is clear and helpful

**Test Case 4: Invalid Response**
1. Mock invalid API response
2. Verify: Error handling works
3. Verify: User-friendly error message

---

### 6. Math Rendering Testing

**Test Case 1: Inline Math**
1. Enter problem with inline math: `Solve for x: $2x + 5 = 13$`
2. Verify: Math renders correctly in conversation
3. Verify: Math is properly formatted

**Test Case 2: Block Math**
1. Enter problem with block math: `$$x^2 + 5x + 6 = 0$$`
2. Verify: Math renders as block equation
3. Verify: Math is centered and properly sized

**Test Case 3: Complex Math**
1. Enter problem with fractions: `$\frac{x}{2} + 3 = 7$`
2. Verify: Fractions render correctly
3. Enter problem with exponents: `$x^2 + 3x + 2$`
4. Verify: Exponents render correctly

---

### 7. Mobile Responsiveness Testing

**Test Case 1: Mobile Layout**
1. Open app on mobile device (or resize browser)
2. Verify: Layout adapts to small screen
3. Verify: Input fields are accessible
4. Verify: Chat messages are readable
5. Verify: Image upload works

**Test Case 2: Tablet Layout**
1. Open app on tablet (or resize browser)
2. Verify: Layout uses available space
3. Verify: All features accessible

---

### 8. Edge Cases Testing

**Test Case 1: Very Short Responses**
1. Respond with single word: "yes"
2. Verify: Tutor handles gracefully
3. Verify: Tutor continues conversation

**Test Case 2: Very Long Responses**
1. Respond with paragraph-length answer
2. Verify: Tutor handles gracefully
3. Verify: Response is processed (may be truncated)

**Test Case 3: Off-Topic Responses**
1. Respond with unrelated text
2. Verify: Tutor redirects to problem
3. Verify: Tutor maintains focus

**Test Case 4: Empty Responses**
1. Submit empty message
2. Verify: Error message appears
3. Verify: Message is not sent

**Test Case 5: Special Characters**
1. Enter problem with special characters: `x² + 5x + 6 = 0`
2. Verify: Special characters handled correctly
3. Verify: Math renders properly

---

## Automated Testing (Future)

### Unit Tests
- Test problem parser with various inputs
- Test prompt engine with different stuckCounts
- Test context manager session handling
- Test math renderer with various LaTeX

### Integration Tests
- Test API endpoints with valid/invalid requests
- Test full conversation flow
- Test error handling paths

### E2E Tests
- Test complete user journey
- Test image upload flow
- Test conversation flow
- Test error recovery

---

## Performance Testing

### Response Time
- Verify: Chat responses < 3 seconds (normal)
- Verify: Image parsing < 10 seconds
- Verify: Text parsing < 2 seconds

### Load Testing
- Test: Multiple concurrent conversations
- Test: Rapid message sending
- Test: Large image uploads

---

## Accessibility Testing

### Keyboard Navigation
- Verify: All inputs accessible via keyboard
- Verify: Tab order is logical
- Verify: Focus indicators visible

### Screen Reader
- Verify: Alt text on images
- Verify: ARIA labels on buttons
- Verify: Content is readable

---

## Browser Compatibility

### Test on:
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

---

## Reporting Issues

When reporting issues, include:
1. Problem description
2. Steps to reproduce
3. Expected behavior
4. Actual behavior
5. Browser/device information
6. Screenshots if applicable

---

## Success Criteria

A test is considered successful if:
1. ✅ Tutor never gives direct answers
2. ✅ Tutor asks guiding questions
3. ✅ Hint escalation works when student is stuck
4. ✅ Conversation context is maintained
5. ✅ Math equations render correctly
6. ✅ Error handling works gracefully
7. ✅ Mobile responsive design works
8. ✅ All problem types are supported

---

**Last Updated**: Current Session  
**Maintained By**: Development Team

