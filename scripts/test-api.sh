#!/bin/bash

# ============================================================================
# API Testing Script
# ============================================================================
# Tests all core features of the AI Tutor platform
# Run this after schema setup to validate everything works
# ============================================================================

BASE_URL="http://localhost:3002"
# Generate a valid UUID for testing
TEST_USER="00000000-0000-0000-0000-$(printf '%012d' $(date +%s))"

echo "🧪 AI Tutor API Testing Suite"
echo "================================"
echo "Base URL: $BASE_URL"
echo "Test User ID: $TEST_USER"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ============================================================================
# TEST 1: Database Status
# ============================================================================
echo "📊 TEST 1: Database Status"
echo "---"

response=$(curl -s "$BASE_URL/api/test/db-status")
exists=$(echo $response | grep -o '"exists":[0-9]*' | cut -d: -f2)
missing=$(echo $response | grep -o '"missing":[0-9]*' | cut -d: -f2)

if [ "$exists" -ge 20 ]; then
  echo -e "${GREEN}✅ PASS${NC} - $exists tables exist"
else
  echo -e "${RED}❌ FAIL${NC} - Only $exists tables exist, expected 20+"
  echo "Missing tables: $missing"
fi
echo ""

# ============================================================================
# TEST 2: Setup Test User (Create Profile First)
# ============================================================================
echo "👤 TEST 2: Setup Test User"
echo "---"

setup_response=$(curl -s -X POST "$BASE_URL/api/test/setup-user" \
  -H "Content-Type: application/json" \
  -d "{\"userId\": \"$TEST_USER\", \"username\": \"tester\", \"role\": \"student\"}")

if echo "$setup_response" | grep -q '"success":true'; then
  echo -e "${GREEN}✅ PASS${NC} - Test user created (profile + XP + streak)"
else
  echo -e "${RED}❌ FAIL${NC} - Failed to setup user"
  echo "$setup_response"
fi
echo ""

# ============================================================================
# TEST 3: XP System - Read
# ============================================================================
echo "📖 TEST 3: XP System - Read Initial Record"
echo "---"

read_response=$(curl -s "$BASE_URL/api/test/xp?userId=$TEST_USER")
count=$(echo "$read_response" | grep -o '"count":[0-9]*' | cut -d: -f2)

if [ "$count" = "1" ]; then
  echo -e "${GREEN}✅ PASS${NC} - Found exactly 1 XP record"
  xp=$(echo "$read_response" | grep -o '"total_xp":[0-9]*' | cut -d: -f2)
  echo "Initial XP: $xp"
else
  echo -e "${RED}❌ FAIL${NC} - Found $count records (expected 1)"
fi
echo ""

# ============================================================================
# TEST 4: XP System - Update (No Duplicates)
# ============================================================================
echo "🔄 TEST 4: XP System - Update Without Duplicates"
echo "---"

# Update 5 times
for i in {1..5}; do
  new_xp=$((60 + i * 10))
  curl -s -X POST "$BASE_URL/api/test/xp" \
    -H "Content-Type: application/json" \
    -d "{\"userId\": \"$TEST_USER\", \"xp\": $new_xp, \"action\": \"update\"}" > /dev/null
done

# Check count
check_response=$(curl -s "$BASE_URL/api/test/xp?userId=$TEST_USER")
final_count=$(echo "$check_response" | grep -o '"count":[0-9]*' | cut -d: -f2)
final_xp=$(echo "$check_response" | grep -o '"total_xp":[0-9]*' | cut -d: -f2)

if [ "$final_count" = "1" ]; then
  echo -e "${GREEN}✅ PASS${NC} - Still 1 record after 5 updates (no duplicates)"
  echo "Final XP: $final_xp"
else
  echo -e "${RED}❌ FAIL${NC} - Found $final_count records (should be 1)"
fi
echo ""

# ============================================================================
# TEST 5: Streak System
# ============================================================================
echo "🔥 TEST 5: Streak System"
echo "---"

streak_response=$(curl -s -X POST "$BASE_URL/api/test/streak" \
  -H "Content-Type: application/json" \
  -d "{\"userId\": \"$TEST_USER\", \"streak\": 3, \"action\": \"increment\"}")

if echo "$streak_response" | grep -q '"success":true'; then
  echo -e "${GREEN}✅ PASS${NC} - Streak record created/updated"
else
  echo -e "${RED}❌ FAIL${NC} - Streak update failed"
  echo "$streak_response"
fi
echo ""

# ============================================================================
# TEST 6: Multi-User Isolation
# ============================================================================
echo "👥 TEST 6: Multi-User Data Isolation"
echo "---"

# Create 3 users
for i in {1..3}; do
  user_id="multi-test-$i"
  curl -s -X POST "$BASE_URL/api/test/xp" \
    -H "Content-Type: application/json" \
    -d "{\"userId\": \"$user_id\", \"xp\": $((i * 100)), \"action\": \"create\"}" > /dev/null
done

# Verify each
passed=0
for i in {1..3}; do
  user_id="multi-test-$i"
  resp=$(curl -s "$BASE_URL/api/test/xp?userId=$user_id")
  count=$(echo "$resp" | grep -o '"count":[0-9]*' | cut -d: -f2)
  xp=$(echo "$resp" | grep -o '"total_xp":[0-9]*' | cut -d: -f2)
  expected=$((i * 100))
  
  if [ "$count" = "1" ] && [ "$xp" = "$expected" ]; then
    ((passed++))
  fi
done

if [ "$passed" = "3" ]; then
  echo -e "${GREEN}✅ PASS${NC} - All 3 users have separate, correct data"
else
  echo -e "${RED}❌ FAIL${NC} - Only $passed/3 users have correct data"
fi
echo ""

# ============================================================================
# SUMMARY
# ============================================================================
echo "================================"
echo "📋 TEST SUMMARY"
echo "================================"
echo "Run this script to validate:"
echo "1. Database tables exist"
echo "2. XP create/update works"
echo "3. No duplicate records"
echo "4. Streak system works"
echo "5. Multi-user isolation"
echo ""
echo "If all tests pass → Ready for UI testing!"
echo "If any fail → Check logs and fix before proceeding"
echo "================================"

