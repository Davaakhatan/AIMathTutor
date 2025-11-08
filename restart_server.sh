#!/bin/bash

# Script to properly restart Next.js dev server with cache clearing

echo "🛑 Stopping Next.js server..."
pkill -f "next dev" || true
sleep 2

echo "🧹 Clearing Next.js cache..."
rm -rf .next
rm -rf node_modules/.cache

echo "✅ Cache cleared!"
echo ""
echo "🚀 Starting server on port 3002..."
echo "Run: npm run dev"
echo ""
echo "After server starts, hard refresh browser (Cmd+Shift+R)"

