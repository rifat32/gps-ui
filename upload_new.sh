#!/bin/bash

# Project Upload Script for GPS UI (React/Vite)
set -e

# Configuration
REMOTE_SERVER="vps2"
LOCAL_DIR="."
REMOTE_DIR="/home/deploy/gps-test-app"
PM2_PORT=4173
SERVICE_NAME=gps-test-app

# --- Connectivity Check ---
echo "🔍 Testing SSH connection to ${REMOTE_SERVER}..."

if ! ssh -q -o BatchMode=yes -o ConnectTimeout=5 ${REMOTE_SERVER} exit; then
    echo "❌ Error: Cannot connect to ${REMOTE_SERVER}."
    echo "   Ensure your ~/.ssh/config is set up correctly and the server is reachable."
    exit 1
fi
echo "✅ Connection successful!"

echo "🔄 Syncing full project to ${REMOTE_SERVER}..."

# Step 2: Sync files
# Using -rlv instead of -a to avoid permission/time setting issues if the user is different from directory owner
echo "📁 Syncing all files..."
rsync -rlv --delete \
    --exclude='node_modules' \
    --exclude='dist' \
    --exclude='.git' \
    --exclude='*.DS_Store' \
    --exclude='*.tmp' \
    --exclude='*.log' \
    -e ssh \
    ${LOCAL_DIR}/ ${REMOTE_SERVER}:${REMOTE_DIR}/

echo "✅ Files synced successfully!"


echo "📦 Installing dependencies and building on remote..."
ssh ${REMOTE_SERVER} "cd ${REMOTE_DIR} && npm install && npm run build"

echo "🔄 Starting UI service with PM2..."
# Using 'vite preview' to serve the build on configured port
ssh ${REMOTE_SERVER} "cd ${REMOTE_DIR} && pm2 delete ${SERVICE_NAME} || true && pm2 start 'npm run serve -- -l ${PM2_PORT}' --name ${SERVICE_NAME}"

echo "🚀 Deployment successful!"
echo "🔗 UI should be accessible on the server's IP at port ${PM2_PORT}"
