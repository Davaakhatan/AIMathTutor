# API Testing Guide
## Test All Features with Curl/Postman

**Date**: November 9, 2025  
**Purpose**: Validate database and API before connecting UI

---

## Test Endpoints Created

### 1. Database Status
```bash
curl http://localhost:3002/api/test/db-status
```

**What it checks**:
- All 35+ tables exist
- Row counts for each table
- Overall health status

**Expected output**:
```json
{
  "success": true,
  "summary": {
    "total": 35,
    "exists": 35,
    "missing": 0,
    "errors": 0,
    "totalRecords": 0,
    "readyForTesting": true
  },
  "tables": {
    "xp_data": { "status": "exists", "count": 0 },
    "streaks": { "status": "exists", "count": 0 },
    ...
  }
}
```

---

### 2. XP System Tests

#### Get XP for User
```bash
curl "http://localhost:3002/api/test/xp?userId=test-user-123"
```

#### Create XP Record
```bash
curl -X POST http://localhost:3002/api/test/xp \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-123",
    "xp": 100,
    "action": "create"
  }'
```

#### Update XP (safe pattern)
```bash
curl -X POST http://localhost:3002/api/test/xp \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-123",
    "xp": 200,
    "action": "update"
  }'
```

#### Test Duplicate Prevention
```bash
# Run this 5 times in a row - should NOT create duplicates
for i in {1..5}; do
  curl -X POST http://localhost:3002/api/test/xp \
    -H "Content-Type: application/json" \
    -d '{
      "userId": "test-user-123",
      "xp": '$((100 + i * 10))',
      "action": "update"
    }'
done

# Then check count - should still be 1 record
curl "http://localhost:3002/api/test/xp?userId=test-user-123"
```

#### Delete XP
```bash
curl -X DELETE "http://localhost:3002/api/test/xp?userId=test-user-123"
```

---

### 3. Streak System Tests

#### Get Streak
```bash
curl "http://localhost:3002/api/test/streak?userId=test-user-123"
```

#### Increment Streak
```bash
curl -X POST http://localhost:3002/api/test/streak \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-123",
    "streak": 5,
    "action": "increment"
  }'
```

---

## Complete Test Flow

### Scenario 1: New User Flow

```bash
# Step 1: Check DB status
curl http://localhost:3002/api/test/db-status

# Step 2: Create XP record (simulates signup)
curl -X POST http://localhost:3002/api/test/xp \
  -H "Content-Type: application/json" \
  -d '{"userId": "new-user-1", "xp": 60, "action": "create"}'

# Step 3: Verify created
curl "http://localhost:3002/api/test/xp?userId=new-user-1"

# Step 4: Create streak
curl -X POST http://localhost:3002/api/test/streak \
  -H "Content-Type: application/json" \
  -d '{"userId": "new-user-1", "streak": 1, "action": "increment"}'

# Step 5: Verify streak
curl "http://localhost:3002/api/test/streak?userId=new-user-1"

# Step 6: Update XP (simulates problem completion)
curl -X POST http://localhost:3002/api/test/xp \
  -H "Content-Type: application/json" \
  -d '{"userId": "new-user-1", "xp": 120, "action": "update"}'

# Step 7: Verify XP updated
curl "http://localhost:3002/api/test/xp?userId=new-user-1"

# Expected: XP = 120, Streak = 1, No duplicates
```

---

### Scenario 2: Concurrent Updates (Race Condition Test)

```bash
# Run 10 concurrent updates - should NOT create duplicates
for i in {1..10}; do
  (curl -X POST http://localhost:3002/api/test/xp \
    -H "Content-Type: application/json" \
    -d '{"userId": "race-test-user", "xp": '$((i * 10))', "action": "update"}' &)
done

wait

# Check - should have exactly 1 record
curl "http://localhost:3002/api/test/xp?userId=race-test-user"
```

---

### Scenario 3: Multi-User Test

```bash
# Create 3 users
for i in {1..3}; do
  curl -X POST http://localhost:3002/api/test/xp \
    -H "Content-Type: application/json" \
    -d '{"userId": "user-'$i'", "xp": '$((i * 50))', "action": "create"}'
done

# Verify each has separate record
curl "http://localhost:3002/api/test/xp?userId=user-1"
curl "http://localhost:3002/api/test/xp?userId=user-2"
curl "http://localhost:3002/api/test/xp?userId=user-3"

# Expected: 3 separate XP records, no cross-contamination
```

---

## Postman Collection

### Collection Setup
1. Create new collection "AI Tutor Tests"
2. Add environment variable: `baseUrl = http://localhost:3002`

### Requests to Add

#### 1. Database Status
```
GET {{baseUrl}}/api/test/db-status
```

#### 2. Get XP
```
GET {{baseUrl}}/api/test/xp?userId={{userId}}
```

#### 3. Create XP
```
POST {{baseUrl}}/api/test/xp
Body (JSON):
{
  "userId": "{{userId}}",
  "xp": 100,
  "action": "create"
}
```

#### 4. Update XP
```
POST {{baseUrl}}/api/test/xp
Body (JSON):
{
  "userId": "{{userId}}",
  "xp": 200,
  "action": "update"
}
```

#### 5. Get Streak
```
GET {{baseUrl}}/api/test/streak?userId={{userId}}
```

#### 6. Update Streak
```
POST {{baseUrl}}/api/test/streak
Body (JSON):
{
  "userId": "{{userId}}",
  "streak": 5,
  "action": "increment"
}
```

---

## Success Criteria

### ✅ All Tests Pass When:

1. **DB Status Check**
   - All 35 tables exist
   - No missing tables
   - No errors

2. **XP Tests**
   - Create XP → Returns 1 record
   - Update XP → Updates existing, doesn't create new
   - 10 concurrent updates → Still 1 record
   - No duplicate key errors

3. **Streak Tests**
   - Increment streak → Creates or updates
   - No duplicates
   - Date updates correctly

4. **Multi-User Tests**
   - 3 users → 3 separate XP records
   - No cross-contamination
   - Each user's data isolated

---

## Common Errors & Fixes

### Error: "Database not configured"
**Fix**: Add `SUPABASE_SERVICE_ROLE_KEY` to `.env.local`

### Error: "duplicate key value violates unique constraint"
**Fix**: Check if `update-then-insert` pattern is working, verify unique indexes exist

### Error: "relation does not exist"
**Fix**: Run `COMPLETE_SCHEMA_V2.sql` to create missing table

### Error: "timeout"
**Fix**: Check RLS policies, simplify query

---

## Next Steps After Testing

Once all curl tests pass:
1. ✅ Database is solid
2. ✅ XP/Streak logic is reliable
3. ✅ Ready to connect UI
4. ✅ Re-enable orchestrator
5. ✅ Test full user flow in browser

---

**Start testing now!** Run the curl commands and share any errors. 🚀

