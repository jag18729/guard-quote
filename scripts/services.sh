#!/bin/bash

# GuardQuote Service Manager
# Usage: ./scripts/services.sh [start|stop|status|restart]

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Service ports
FRONTEND_PORT=5173
BACKEND_PORT=3000
ML_PORT=8000

print_header() {
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  GuardQuote Service Manager${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo ""
}

check_port() {
    lsof -i :$1 >/dev/null 2>&1
    return $?
}

check_health() {
    local url=$1
    local response=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 2 "$url" 2>/dev/null)
    if [ "$response" = "200" ]; then
        return 0
    fi
    return 1
}

status_services() {
    print_header
    echo -e "${YELLOW}Service Status:${NC}"
    echo ""

    # Frontend
    if check_port $FRONTEND_PORT; then
        if check_health "http://localhost:$FRONTEND_PORT"; then
            echo -e "  Frontend (Vite)     ${GREEN}● ONLINE${NC}  http://localhost:$FRONTEND_PORT"
        else
            echo -e "  Frontend (Vite)     ${YELLOW}● STARTING${NC}"
        fi
    else
        echo -e "  Frontend (Vite)     ${RED}● OFFLINE${NC}"
    fi

    # Backend
    if check_port $BACKEND_PORT; then
        if check_health "http://localhost:$BACKEND_PORT/api/health"; then
            echo -e "  Backend (NestJS)    ${GREEN}● ONLINE${NC}  http://localhost:$BACKEND_PORT"
        else
            echo -e "  Backend (NestJS)    ${YELLOW}● STARTING${NC}"
        fi
    else
        echo -e "  Backend (NestJS)    ${RED}● OFFLINE${NC}"
    fi

    # ML Engine
    if check_port $ML_PORT; then
        if check_health "http://localhost:$ML_PORT/api/v1/health"; then
            echo -e "  ML Engine (FastAPI) ${GREEN}● ONLINE${NC}  http://localhost:$ML_PORT"
        else
            echo -e "  ML Engine (FastAPI) ${YELLOW}● STARTING${NC}"
        fi
    else
        echo -e "  ML Engine (FastAPI) ${RED}● OFFLINE${NC}"
    fi

    # MySQL
    if command -v mysql &> /dev/null; then
        if mysql -u root -e "SELECT 1" &>/dev/null; then
            echo -e "  MySQL Database      ${GREEN}● ONLINE${NC}"
        else
            echo -e "  MySQL Database      ${RED}● OFFLINE${NC}"
        fi
    else
        echo -e "  MySQL Database      ${YELLOW}● NOT INSTALLED${NC}"
    fi

    echo ""
    echo -e "${YELLOW}URLs:${NC}"
    echo "  Landing Page:     http://localhost:$FRONTEND_PORT"
    echo "  Security Quote:   http://localhost:$FRONTEND_PORT/quote/security"
    echo "  ML API Docs:      http://localhost:$ML_PORT/docs"
    echo ""
}

start_services() {
    print_header
    echo -e "${YELLOW}Starting services...${NC}"
    echo ""

    # Start ML Engine
    if ! check_port $ML_PORT; then
        echo -e "  Starting ML Engine..."
        cd "$PROJECT_DIR/ml-engine"
        if [ -d ".venv" ]; then
            source .venv/bin/activate
        fi
        nohup python -m uvicorn src.main:app --host 0.0.0.0 --port $ML_PORT > /tmp/guardquote-ml.log 2>&1 &
        sleep 2
        if check_port $ML_PORT; then
            echo -e "  ML Engine           ${GREEN}● STARTED${NC}"
        else
            echo -e "  ML Engine           ${RED}● FAILED${NC} (check /tmp/guardquote-ml.log)"
        fi
    else
        echo -e "  ML Engine           ${GREEN}● ALREADY RUNNING${NC}"
    fi

    # Start Backend
    if ! check_port $BACKEND_PORT; then
        echo -e "  Starting Backend..."
        cd "$PROJECT_DIR/backend"
        nohup bun run start > /tmp/guardquote-backend.log 2>&1 &
        sleep 2
        if check_port $BACKEND_PORT; then
            echo -e "  Backend             ${GREEN}● STARTED${NC}"
        else
            echo -e "  Backend             ${YELLOW}● STARTING (may take a moment)${NC}"
        fi
    else
        echo -e "  Backend             ${GREEN}● ALREADY RUNNING${NC}"
    fi

    # Start Frontend
    if ! check_port $FRONTEND_PORT; then
        echo -e "  Starting Frontend..."
        cd "$PROJECT_DIR/frontend"
        nohup npm run dev > /tmp/guardquote-frontend.log 2>&1 &
        sleep 2
        if check_port $FRONTEND_PORT; then
            echo -e "  Frontend            ${GREEN}● STARTED${NC}"
        else
            echo -e "  Frontend            ${RED}● FAILED${NC} (check /tmp/guardquote-frontend.log)"
        fi
    else
        echo -e "  Frontend            ${GREEN}● ALREADY RUNNING${NC}"
    fi

    echo ""
    sleep 2
    status_services
}

stop_services() {
    print_header
    echo -e "${YELLOW}Stopping services...${NC}"
    echo ""

    pkill -f "vite" 2>/dev/null && echo -e "  Frontend            ${RED}● STOPPED${NC}" || echo -e "  Frontend            ${YELLOW}● NOT RUNNING${NC}"
    pkill -f "nest" 2>/dev/null && echo -e "  Backend             ${RED}● STOPPED${NC}" || echo -e "  Backend             ${YELLOW}● NOT RUNNING${NC}"
    pkill -f "uvicorn" 2>/dev/null && echo -e "  ML Engine           ${RED}● STOPPED${NC}" || echo -e "  ML Engine           ${YELLOW}● NOT RUNNING${NC}"

    echo ""
}

case "$1" in
    start)
        start_services
        ;;
    stop)
        stop_services
        ;;
    restart)
        stop_services
        sleep 2
        start_services
        ;;
    status|"")
        status_services
        ;;
    *)
        echo "Usage: $0 {start|stop|status|restart}"
        exit 1
        ;;
esac
