#!/bin/bash

# Recipe Ingestion Pipeline - Cron Job Script
# 
# This script is designed to be run as a cron job for scheduled recipe ingestion.
# It includes error handling, logging, and notification capabilities.
#
# Example cron configuration (run every Sunday at 2 AM):
# 0 2 * * 0 /path/to/recipe-pipeline/examples/cron-job.sh >> /var/log/recipe-ingestion-cron.log 2>&1

set -e  # Exit on error

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_DIR="${PROJECT_DIR}/logs"
LOG_FILE="${LOG_DIR}/ingestion-$(date +%Y%m%d-%H%M%S).log"
LOCK_FILE="/tmp/recipe-ingestion.lock"
MAX_RUNTIME=3600  # 1 hour in seconds

# Email notification settings (optional)
NOTIFY_EMAIL="${NOTIFY_EMAIL:-}"
NOTIFY_ON_SUCCESS="${NOTIFY_ON_SUCCESS:-false}"
NOTIFY_ON_FAILURE="${NOTIFY_ON_FAILURE:-true}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Create logs directory if it doesn't exist
mkdir -p "$LOG_DIR"

# Function to log messages
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Function to send email notification
send_notification() {
    local subject="$1"
    local body="$2"
    
    if [ -n "$NOTIFY_EMAIL" ]; then
        echo "$body" | mail -s "$subject" "$NOTIFY_EMAIL"
        log "Notification sent to $NOTIFY_EMAIL"
    fi
}

# Function to cleanup on exit
cleanup() {
    local exit_code=$?
    
    # Remove lock file
    if [ -f "$LOCK_FILE" ]; then
        rm -f "$LOCK_FILE"
        log "Lock file removed"
    fi
    
    # Send notification on failure
    if [ $exit_code -ne 0 ] && [ "$NOTIFY_ON_FAILURE" = "true" ]; then
        send_notification \
            "Recipe Ingestion Failed" \
            "The recipe ingestion job failed with exit code $exit_code. Check logs at $LOG_FILE"
    fi
    
    exit $exit_code
}

# Set trap to cleanup on exit
trap cleanup EXIT INT TERM

# Check if another instance is running
if [ -f "$LOCK_FILE" ]; then
    log "${RED}ERROR: Another instance is already running (lock file exists)${NC}"
    exit 1
fi

# Create lock file
echo $$ > "$LOCK_FILE"
log "Lock file created (PID: $$)"

# Start job
log "${GREEN}=== Recipe Ingestion Job Started ===${NC}"
log "Project directory: $PROJECT_DIR"
log "Log file: $LOG_FILE"

# Change to project directory
cd "$PROJECT_DIR"

# Check if .env file exists
if [ ! -f ".env" ]; then
    log "${RED}ERROR: .env file not found${NC}"
    exit 1
fi

# Load environment variables
set -a
source .env
set +a
log "Environment variables loaded"

# Validate required environment variables
if [ -z "$USDA_API_KEY" ]; then
    log "${RED}ERROR: USDA_API_KEY not set${NC}"
    exit 1
fi

if [ -z "$SUPABASE_URL" ]; then
    log "${RED}ERROR: SUPABASE_URL not set${NC}"
    exit 1
fi

if [ -z "$SUPABASE_SERVICE_KEY" ]; then
    log "${RED}ERROR: SUPABASE_SERVICE_KEY not set${NC}"
    exit 1
fi

log "Environment validation passed"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    log "${YELLOW}WARNING: node_modules not found, running npm install${NC}"
    npm install >> "$LOG_FILE" 2>&1
fi

# Run the ingestion pipeline with timeout
log "Starting ingestion pipeline..."
START_TIME=$(date +%s)

if timeout $MAX_RUNTIME npm run ingest >> "$LOG_FILE" 2>&1; then
    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))
    
    log "${GREEN}=== Recipe Ingestion Job Completed Successfully ===${NC}"
    log "Duration: ${DURATION}s"
    
    # Send success notification if enabled
    if [ "$NOTIFY_ON_SUCCESS" = "true" ]; then
        send_notification \
            "Recipe Ingestion Completed" \
            "The recipe ingestion job completed successfully in ${DURATION}s. Check logs at $LOG_FILE"
    fi
    
    # Cleanup old log files (keep last 30 days)
    find "$LOG_DIR" -name "ingestion-*.log" -mtime +30 -delete
    log "Old log files cleaned up"
    
    exit 0
else
    EXIT_CODE=$?
    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))
    
    if [ $EXIT_CODE -eq 124 ]; then
        log "${RED}ERROR: Job timed out after ${MAX_RUNTIME}s${NC}"
    else
        log "${RED}ERROR: Job failed with exit code $EXIT_CODE${NC}"
    fi
    
    log "Duration: ${DURATION}s"
    exit $EXIT_CODE
fi
