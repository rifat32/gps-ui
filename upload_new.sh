#!/bin/bash

# Project Upload Script - Full Project
set -e

# Configuration
REMOTE_USER="ronymia"
REMOTE_HOST="77.68.52.203"
REMOTE_DIR="/home/deploy/gps-test-app"
LOCAL_DIR="."


echo "🚀 Deploying full project..."


echo "🔄 Syncing full project to ${REMOTE_HOST}..."

# Step 2: Sync files
echo "📁 Syncing all files..."
rsync -av --delete \
    --exclude='node_modules' \
    --exclude='.git' \
    --exclude='*.DS_Store' \
    --exclude='*.tmp' \
    --exclude='*.log' \
    --exclude='.env.local' \
    ./ ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_DIR}/

echo "✅ Files synced successfully!"

# Step 3: Remote Execution (Build and PM2 Restart)
echo "🔧 Executing remote build and restart..."
ssh -o StrictHostKeyChecking=no ${REMOTE_USER}@${REMOTE_HOST} << EOF
    # Load NVM if available
    export NVM_DIR="\$HOME/.nvm"
    [ -s "\$NVM_DIR/nvm.sh" ] && \. "\$NVM_DIR/nvm.sh"
    
    set -e
    cd ${REMOTE_DIR}
    
    echo "📦 Installing dependencies..."
    yarn install
    
    echo "🏗️ Building the project..."
    yarn build
    
    # Load variables for PM2
    if [ -f .env ]; then
        export \$(grep -v '^#' .env | xargs)
    fi
    PM2_PORT=\${PM2_PORT:-4173}
    SERVICE_NAME=\${SERVICE_NAME:-gps-ui-test}

    echo "🔄 Restarting service with PM2..."
    pm2 delete \${SERVICE_NAME} || true
    pm2 start "node_modules/.bin/serve -s dist -l \${PM2_PORT}" --name \${SERVICE_NAME}
    
    # Save PM2 state
    pm2 save
EOF

echo ""
echo "✅ Deployment and build completed successfully!"
