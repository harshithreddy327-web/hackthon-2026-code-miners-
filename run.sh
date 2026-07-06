#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

# Setup color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}===================================================${NC}"
echo -e "${BLUE}              NeuroScribe Startup Launcher          ${NC}"
echo -e "${BLUE}===================================================${NC}"

# Add portable Node.js to PATH
export PATH="/Users/mac/neuro tec/node/bin:$PATH"

echo -e "${GREEN}✓ Node.js path configured: $(node -v)${NC}"

# Verify installation directories
if [ ! -d "backend/node_modules" ]; then
    echo -e "${YELLOW}node_modules not found in backend. Installing backend dependencies...${NC}"
    cd backend && npm install && cd ..
fi

if [ ! -d "frontend/node_modules" ]; then
    echo -e "${YELLOW}node_modules not found in frontend. Installing frontend dependencies...${NC}"
    cd frontend && npm install && cd ..
fi

echo -e "${GREEN}✓ All package installations verified.${NC}"

# Clear ports 5001 and 5173 if they are occupied
echo -e "${YELLOW}Checking and freeing ports 5001 & 5173...${NC}"
PID_5001=$(lsof -t -i:5001 || true)
PID_5173=$(lsof -t -i:5173 || true)

if [ ! -z "$PID_5001" ]; then
    echo "Port 5001 is active (PID: $PID_5001). Killing existing process..."
    kill -9 $PID_5001 || true
fi

if [ ! -z "$PID_5173" ]; then
    echo "Port 5173 is active (PID: $PID_5173). Killing existing process..."
    kill -9 $PID_5173 || true
fi

# Launch backend
echo -e "${BLUE}Starting Node.js/Express Backend Server on port 5001...${NC}"
cd backend
npm run start > server.log 2>&1 &
BACKEND_PID=$!
cd ..

# Launch frontend
echo -e "${BLUE}Starting Vite React Frontend Server on port 5173...${NC}"
cd frontend
npm run dev > dev.log 2>&1 &
FRONTEND_PID=$!
cd ..

# Save PID tracker
echo "$BACKEND_PID" > .backend.pid
echo "$FRONTEND_PID" > .frontend.pid

# Graceful termination handler
cleanup() {
    echo -e "\n${YELLOW}Shutting down servers...${NC}"
    kill -9 $BACKEND_PID 2>/dev/null || true
    kill -9 $FRONTEND_PID 2>/dev/null || true
    rm -f .backend.pid .frontend.pid
    echo -e "${GREEN}Done.${NC}"
    exit 0
}

trap cleanup INT TERM

# Wait for servers to initialize
sleep 2

echo -e "${BLUE}===================================================${NC}"
echo -e "${GREEN}✓ NEUROSCRIBE IS READY TO RUN LOCALLY!${NC}"
echo -e "  - ${GREEN}Frontend Application:${NC} http://localhost:5173"
echo -e "  - ${GREEN}Backend API Endpoint:${NC} http://localhost:5001"
echo -e "${BLUE}===================================================${NC}"
echo -e "Press [Ctrl+C] to gracefully stop both servers."

# Keep script running to show logs/monitor
wait
