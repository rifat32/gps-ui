#!/bin/bash

# Deployment Script for GPS UI (Native)
# Target: 54.37.225.65
set -e

# Configuration
REMOTE_USER="ubuntu"
REMOTE_HOST="54.37.225.65"
REMOTE_DIR="/home/ubuntu/gps-ui"
LOCAL_DIR="."

# 1. Build the application locally
echo "🏗️ Building the application locally..."
yarn build

# 2. Sync files to remote (including dist)
echo "🔄 Syncing files to remote..."
rsync -av --delete \
    --exclude='node_modules' \
    --exclude='.git' \
    --exclude='*.DS_Store' \
    --exclude='*.tmp' \
    --exclude='*.log' \
    --exclude='.env' \
    --exclude='.env.local' \
    ${LOCAL_DIR}/ ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_DIR}/

# 3. Upload the server environment file
echo "🔑 Uploading server environment (.env.old)..."
scp .env.old ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_DIR}/.env.old

# 4. Remote Execution: Restart with PM2
echo "🔧 Executing remote restart..."
ssh -o StrictHostKeyChecking=no ${REMOTE_USER}@${REMOTE_HOST} << EOF
    # Load NVM
    export NVM_DIR="\$HOME/.nvm"
    [ -s "\$NVM_DIR/nvm.sh" ] && \. "\$NVM_DIR/nvm.sh"
    
    set -e
    cd ${REMOTE_DIR}
    
    # Update .env
    cp .env.old .env
    
    # Load variables for PM2
    export \$(grep -v '^#' .env | xargs)
    PM2_PORT=\${PM2_PORT:-4173}
    SERVICE_NAME=\${SERVICE_NAME:-gps-ui}

    # Ensure a local static server is installed if node_modules is missing
    if [ ! -d "node_modules" ]; then
        echo "📦 Installing static file server..."
        npm install serve
    fi

    echo "🔄 Restarting service with PM2..."
    pm2 delete \${SERVICE_NAME} || true
    pm2 start "node_modules/.bin/serve -s dist -l \${PM2_PORT}" --name \${SERVICE_NAME}
    
    # Save PM2 state
    pm2 save
EOF

echo ""
echo "✅ GPS UI native deployment completed successfully!"
echo "🔗 Frontend should be accessible at: http://${REMOTE_HOST}:4173"
