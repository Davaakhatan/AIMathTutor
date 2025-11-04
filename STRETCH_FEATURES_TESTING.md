# Stretch Features Testing Guide
## AI Math Tutor - Testing Instructions

This guide provides step-by-step instructions for testing all stretch features and the core application.

---

## 🚀 Quick Start Testing

### 1. Start the Development Server

```bash
# Navigate to project directory
cd AITutor

# Install dependencies (if not already done)
npm install

# Start development server
npm run dev

# Or use port 3002 if 3000 is busy
npm run dev:3002
```

### 2. Open Browser

Navigate to:
- `http://localhost:3000` (or `http://localhost:3002` if using that port)

### 3. Verify Environment

- ✅ Check browser console for errors
- ✅ Verify `.env.local` has `OPENAI_API_KEY` set
- ✅ Ensure API key is valid and has credits

---

## 📋 Complete Testing Checklist

### Core Features Testing

#### Text Input
- [ ] Enter simple problem: `2x + 5 = 13`
- [ ] Verify problem is parsed correctly
- [ ] Verify conversation starts
- [ ] Verify math rendering works

#### Image Upload
- [ ] Upload JPG image with math problem
- [ ] Upload PNG image with math problem
- [ ] Verify image preview appears
- [ ] Verify problem is extracted correctly
- [ ] Test with large image (>10MB) - should show error

#### Chat Conversation
- [ ] Send message and receive tutor response
- [ ] Verify tutor asks questions, not giving answers
- [ ] Verify conversation context is maintained
- [ ] Test "Restart conversation" button
- [ ] Verify error handling (disconnect network, test retry)

---

## 🎯 Stretch Features Testing

### 1. Step Visualization

**Test Steps:**
1. Enter a problem: `2x + 5 = 13`
2. Have a conversation with 3-4 exchanges
3. Look for "Solution Steps" section above messages
4. Verify steps appear with visual indicators

**What to Verify:**
- ✅ Step visualization appears after 2+ messages
- ✅ Steps show progress (completed/current/pending)
- ✅ Steps are clickable to expand/collapse
- ✅ Steps update as conversation progresses
- ✅ Visual indicators (checkmarks, numbers) are correct

**Test Cases:**
- **Case 1**: Simple equation
  - Problem: `3x - 7 = 14`
  - Expected: Steps show "Step 1: Initial Setup", "Step 2: Next Operation"
  
- **Case 2**: Multi-step problem
  - Problem: `2(x + 3) - 5 = 11`
  - Expected: Multiple steps detected

---

### 2. Voice Interface

**Prerequisites:**
- Browser with Web Speech API support (Chrome, Edge, Safari 14.1+)
- Microphone access permission

**Test Steps:**
1. Start a conversation with a problem
2. Look for microphone button in chat header
3. Click microphone button
4. Speak a response (e.g., "I think we should subtract 5")
5. Verify speech is converted to text
6. Verify text is sent as message
7. Wait for tutor response
8. Verify tutor response is spoken (if voice enabled)

**What to Verify:**
- ✅ Microphone button appears in chat header
- ✅ Button shows "listening" state when active
- ✅ Speech-to-text conversion works
- ✅ Text-to-speech plays tutor responses
- ✅ Voice toggle button (🔊/🔇) works
- ✅ Voice can be enabled/disabled

**Test Cases:**
- **Case 1**: Speech Input
  - Say: "I don't know what to do"
  - Expected: Text appears in input, message sent
  
- **Case 2**: Text-to-Speech
  - Receive tutor response
  - Expected: Response is spoken aloud (if voice enabled)
  
- **Case 3**: Browser Compatibility
  - Test in Chrome (should work)
  - Test in Firefox (may not support speech recognition)
  - Test in Safari (should work on 14.1+)

**Troubleshooting:**
- If microphone doesn't work: Check browser permissions
- If speech recognition fails: Use Chrome or Edge
- If text-to-speech doesn't work: Check browser console for errors

---

### 3. Interactive Whiteboard

**Test Steps:**
1. Start a conversation with a problem
2. Look for "Show Whiteboard" button
3. Click to show whiteboard
4. Test drawing with mouse (or touch on mobile)
5. Test color picker
6. Test line width slider
7. Test "Clear" button
8. Test "Download" button
9. Click "Hide Whiteboard" to collapse

**What to Verify:**
- ✅ Whiteboard toggle button works
- ✅ Canvas is drawable with mouse
- ✅ Canvas supports touch (on mobile/tablet)
- ✅ Color picker changes stroke color
- ✅ Line width slider adjusts stroke size
- ✅ Clear button clears canvas
- ✅ Download button saves image
- ✅ Whiteboard is responsive

**Test Cases:**
- **Case 1**: Drawing
  - Draw a simple equation: `x + 5 = 13`
  - Expected: Lines appear smoothly
  
- **Case 2**: Color Selection
  - Select different colors
  - Draw lines
  - Expected: Each color draws correctly
  
- **Case 3**: Download
  - Draw something
  - Click "Download"
  - Expected: PNG file downloads with drawing

**Mobile Testing:**
- Test on touch device (phone/tablet)
- Verify touch drawing works
- Verify UI is responsive

---

### 4. Difficulty Modes

**Test Steps:**
1. Start a conversation with a problem
2. Look for "Difficulty Level" selector at top
3. Test each mode:
   - Elementary
   - Middle School
   - High School
   - Advanced
4. Send a message in each mode
5. Compare tutor responses

**What to Verify:**
- ✅ Difficulty selector appears above chat
- ✅ All four modes are selectable
- ✅ Selected mode is highlighted
- ✅ Tutor responses adapt to difficulty level
- ✅ Mode persists during conversation

**Test Cases:**
- **Case 1**: Elementary Mode
  - Problem: `2x + 5 = 13`
  - Student: "I don't know"
  - Expected: Very simple language, lots of encouragement
  
- **Case 2**: Middle School Mode
  - Problem: `2x + 5 = 13`
  - Student: "I don't know"
  - Expected: Balanced guidance, age-appropriate language
  
- **Case 3**: High School Mode
  - Problem: `2x + 5 = 13`
  - Student: "I don't know"
  - Expected: More sophisticated language, less scaffolding
  
- **Case 4**: Advanced Mode
  - Problem: `x^2 + 5x + 6 = 0`
  - Student: "I don't know"
  - Expected: Precise mathematical language, minimal hints

**Comparison Test:**
1. Start same problem in Elementary mode
2. Note the tutor's response style
3. Switch to Advanced mode
4. Note the difference in language and scaffolding

---

## 🧪 Automated Testing

### Run Test Scripts

```bash
# Test all problem types
npm run test:all

# Test specific problem type
npm run test:type arithmetic

# Test parsing
npm run test:parse "2x + 5 = 13"

# Test chat conversation
npm run test:chat "2x + 5 = 13"
```

### Manual Test Scenarios

#### Scenario 1: Complete Workflow
1. Enter problem via text
2. Have 3-4 message exchanges
3. Verify step visualization appears
4. Test voice input
5. Draw on whiteboard
6. Change difficulty mode
7. Continue conversation
8. Verify all features work together

#### Scenario 2: Error Handling
1. Disconnect internet
2. Try to send message
3. Verify error message appears
4. Verify retry logic works
5. Reconnect internet
6. Verify message sends successfully

#### Scenario 3: Mobile Testing
1. Open on mobile device
2. Test all features:
   - Text input
   - Image upload
   - Voice interface
   - Whiteboard (touch drawing)
   - Difficulty modes
3. Verify responsive design

---

## 🌐 Browser Compatibility Testing

### Supported Browsers

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| Text Input | ✅ | ✅ | ✅ | ✅ |
| Image Upload | ✅ | ✅ | ✅ | ✅ |
| Math Rendering | ✅ | ✅ | ✅ | ✅ |
| Voice Input | ✅ | ❌ | ✅ (14.1+) | ✅ |
| Voice Output | ✅ | ✅ | ✅ | ✅ |
| Whiteboard | ✅ | ✅ | ✅ | ✅ |
| Step Visualization | ✅ | ✅ | ✅ | ✅ |

**Notes:**
- Voice recognition requires Chrome, Edge, or Safari 14.1+
- Firefox does not support Web Speech Recognition API
- All other features work across all modern browsers

---

## 📱 Mobile Testing

### Test on Real Device
1. Ensure dev server is accessible on network
2. Find your local IP: `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
3. Access from mobile: `http://YOUR_IP:3000`
4. Test all features on mobile browser

### Test Responsive Design
1. Open browser DevTools (F12)
2. Toggle device toolbar (Ctrl+Shift+M)
3. Test different screen sizes:
   - Mobile (375px)
   - Tablet (768px)
   - Desktop (1024px+)
4. Verify all UI elements are accessible

---

## 🐛 Common Issues & Solutions

### Issue: Voice Not Working
**Solution:**
- Check browser permissions for microphone
- Use Chrome or Edge browser
- Verify HTTPS (required in production)

### Issue: Whiteboard Not Drawing
**Solution:**
- Check browser console for errors
- Verify canvas is not disabled
- Try refreshing page

### Issue: Step Visualization Not Appearing
**Solution:**
- Ensure you have 2+ messages in conversation
- Check browser console for errors
- Verify problem is set

### Issue: Difficulty Mode Not Changing Responses
**Solution:**
- Verify mode is selected before sending message
- Check API response includes difficulty mode
- Verify prompt engine is updated

---

## ✅ Final Verification Checklist

Before considering testing complete:

- [ ] All core features work
- [ ] All stretch features work
- [ ] Error handling works
- [ ] Mobile responsive
- [ ] Browser compatibility verified
- [ ] No console errors
- [ ] Performance is acceptable
- [ ] Accessibility features work (keyboard navigation, ARIA labels)

---

## 📊 Performance Testing

### Load Time
- Initial page load: < 2 seconds
- Problem parsing: < 5 seconds
- Chat response: < 10 seconds

### Memory Usage
- Check browser DevTools > Memory
- Verify no memory leaks during extended use

### Network Testing
- Test with slow 3G connection
- Verify timeout handling works
- Verify retry logic functions

---

## 🎯 Testing Tips

1. **Test in Incognito Mode**: Avoid browser cache issues
2. **Clear Browser Data**: Start fresh for each test session
3. **Check Console**: Always check browser console for errors
4. **Test Edge Cases**: Try invalid inputs, empty fields, etc.
5. **Test Accessibility**: Use keyboard navigation, screen readers
6. **Test Performance**: Monitor network requests, response times

---

## 📝 Reporting Issues

If you find bugs, note:
1. Browser and version
2. Steps to reproduce
3. Expected vs actual behavior
4. Console errors (if any)
5. Screenshots (if helpful)

---

**Happy Testing!** 🚀

