# Event System Testing Guide

**Phase 1, Week 1 - Event System & Orchestration**  
**Status**: Integration Complete, Ready for Testing

---

## 🎯 **What's Been Built**

### **1. Event Bus** (`lib/eventBus.ts`)
- Central event system using pub/sub pattern
- 20+ event types defined
- Event history tracking
- Error-safe async handler execution

### **2. Orchestrator** (`services/orchestrator.ts`)
- Coordinates multi-system workflows
- Handles problem completion (XP, streaks, events)
- Handles achievement unlocks
- Handles goal completion (ready for Week 2)

### **3. Integration Points**
- ✅ Orchestrator initializes on app startup (`OrchestratorInit`)
- ✅ Problem completion emits events (`ProblemProgress`)
- ✅ Achievements listen for events (`AchievementsContent`)
- ✅ userId/profileId passed from parent components

---

## 🧪 **Testing the Event Flow**

### **Test 1: Problem Completion Event**

**Steps:**
1. Start the app and login
2. Open browser console
3. Start solving a problem
4. When problem is marked as solved, look for:

**Expected Console Logs:**
```
✅ Problem marked as solved: { ... }
🎉 Problem solved! Emitting completion event { userId: "xxx", problemType: "algebra" }
[INFO] Event emitted { eventType: "problem_completed", userId: "xxx", handlerCount: 1 }
[INFO] Orchestrating problem completion { userId: "xxx", problemType: "algebra" }
[INFO] XP updated for problem completion { userId: "xxx", xpGained: 10, newLevel: 2 }
[INFO] Streak updated for problem completion { userId: "xxx", newStreak: 5 }
[INFO] Problem completion orchestrated successfully
```

**What This Tests:**
- ✅ Event emission from ProblemProgress
- ✅ Event bus routing
- ✅ Orchestrator handling
- ✅ XP update
- ✅ Streak update

---

### **Test 2: Achievement Event Listening**

**Steps:**
1. Solve a problem
2. Navigate to Achievements tab
3. Check console for:

**Expected Console Logs:**
```
[Achievements] Problem completed event received { problemText: "...", problemType: "algebra" }
[AchievementsContent] Checking achievements with stats: { problemsSolved: 1, ... }
```

**What This Tests:**
- ✅ Cross-component event listening
- ✅ Achievement service integration
- ✅ Automatic achievement checking

---

### **Test 3: Event History**

**Steps:**
1. Solve 2-3 problems
2. In browser console, run:

```javascript
import("/lib/eventBus").then(({ default: eventBus }) => {
  const history = eventBus.getHistory({ limit: 10 });
  console.log("Recent events:", history);
});
```

**Expected Output:**
```
Recent events: [
  { type: "problem_completed", userId: "xxx", timestamp: "...", data: {...} },
  { type: "problem_completed", userId: "xxx", timestamp: "...", data: {...} },
  ...
]
```

**What This Tests:**
- ✅ Event history tracking
- ✅ Event storage
- ✅ Query functionality

---

## 🔍 **Debugging**

### **If Events Don't Fire:**

1. **Check orchestrator initialized:**
```
[INFO] Initializing ecosystem orchestrator
[INFO] Orchestrator initialized - listening to events
```

2. **Check problem solved detection:**
```
✅ Problem marked as solved
🎉 Problem solved! Emitting completion event
```

3. **Check event bus:**
```
[INFO] Event emitted { eventType: "problem_completed", handlerCount: 1 }
```

### **Common Issues:**

**Issue**: No "Orchestrator initialized" log
**Fix**: Check OrchestratorInit is in layout.tsx

**Issue**: "handlerCount: 0" in event emission
**Fix**: initializeOrchestrator() not called or failed

**Issue**: Event emitted but no orchestrator action
**Fix**: Check orchestrator handler registration

---

## ✅ **Success Criteria**

Week 1 is complete when:
- ✅ Orchestrator initializes on app startup
- ✅ Problem completion emits event
- ✅ Orchestrator receives and handles event
- ✅ XP updated automatically
- ✅ Streak updated automatically
- ✅ Achievements listen for events
- ✅ Console logs show complete flow

---

## 📊 **Week 1 Progress**

- [x] Build event bus
- [x] Create orchestrator service
- [x] Integrate with existing features
- [ ] Test event flow (IN PROGRESS)

**Completion**: 80%

---

## 🚀 **Next Steps (Week 2)**

After Week 1 testing is complete:

1. **Conversation Summary Generation**
   - Summarize chat sessions
   - Store in conversation_summaries table
   - Retrieve in future sessions

2. **Goal System**
   - Create goals UI
   - Track goal progress
   - Complete goals

3. **Subject Recommendations**
   - Recommend based on completed problems
   - Suggest practice areas

---

**Status**: Event system foundation complete! Ready for testing! 🎉

