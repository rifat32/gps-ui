#!/bin/bash

# Project Upload Script for GPS UI (React/Vite)
set -e

# Configuration
REMOTE_USER="ubuntu"
REMOTE_HOST="54.37.225.65"
REMOTE_DIR="/home/ubuntu/gps-ui"
LOCAL_DIR="."

# Load .env file (for SERVER_PASSWORD)
if [ -f ../final-dashcam/.env ]; then
    export $(grep -v '^#' ../final-dashcam/.env | xargs)
elif [ -f .env ]; then
    # Note: gps-ui/.env might not have SERVER_PASSWORD, so we check final-dashcam first
    export $(grep -v '^#' .env | xargs)
fi

# Set SSHPASS for sshpass tool
export SSHPASS=$SERVER_PASSWORD

echo "🔄 Syncing files to ${REMOTE_HOST}..."

# Sync files only, using sshpass for authentication
sshpass -e rsync -av --delete \
    --exclude='node_modules' \
    --exclude='dist' \
    --exclude='.git' \
    --exclude='*.DS_Store' \
    --exclude='*.tmp' \
    --exclude='*.log' \
    -e ssh \
    ${LOCAL_DIR}/ ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_DIR}/

echo "✅ Files synced successfully!"

echo "📦 Installing dependencies and building on remote..."
sshpass -e ssh ${REMOTE_USER}@${REMOTE_HOST} "cd ${REMOTE_DIR} && npm install && npm run build"

echo "🔄 Starting UI service with PM2..."
# Using 'vite preview' to serve the build on port 4173
sshpass -e ssh ${REMOTE_USER}@${REMOTE_HOST} "cd ${REMOTE_DIR} && pm2 delete gps-ui || true && pm2 start 'npm run preview -- --host 0.0.0.0 --port 4173' --name gps-ui"

echo "🚀 Deployment successful!"
echo "🔗 UI should be accessible at: http://${REMOTE_HOST}:4173"
