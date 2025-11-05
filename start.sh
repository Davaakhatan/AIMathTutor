#!/bin/bash

# Script to stop and start the Next.js dev server

PORT=3002
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🛑 Stopping any running Next.js server on port $PORT..."

# Find and kill processes on port 3002
lsof -ti:$PORT | xargs kill -9 2>/dev/null || echo "No process found on port $PORT"

# Wait a moment for the port to be released
sleep 1

echo "✅ Server stopped"
echo ""
echo "🚀 Starting Next.js dev server on port $PORT..."
echo ""

# Start the dev server
cd "$SCRIPT_DIR"
npm run dev:3002

