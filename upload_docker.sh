#!/bin/bash

# ─────────────────────────────────────────────────────────────
# Docker Deployment Script for GPS UI (gps-test-app)
# Uses .env.new → docker compose up --build on remote
# ─────────────────────────────────────────────────────────────
set -e

# ── Configuration (sourced from .env.new) ────────────────────
ENV_FILE=".env.new"

if [ ! -f "${ENV_FILE}" ]; then
    echo "❌ Error: ${ENV_FILE} not found in the current directory."
    exit 1
fi

# Load config vars (non-VITE_ ones used by this script)
export $(grep -v '^#' "${ENV_FILE}" | grep -v '^VITE_' | xargs)

REMOTE_SERVER="vps2"
REMOTE_DIR="${REMOTE_DIR:-/home/deploy/gps-test-app}"
SERVICE_NAME="${SERVICE_NAME:-gps-test-app}"
PM2_PORT="${PM2_PORT:-4173}"

# ── SSH Connectivity Check ────────────────────────────────────
echo "🔍 Testing SSH connection to ${REMOTE_SERVER}..."
if ! ssh -q -o BatchMode=yes -o ConnectTimeout=5 "${REMOTE_SERVER}" exit; then
    echo "❌ Cannot connect to ${REMOTE_SERVER}."
    echo "   Ensure ~/.ssh/config is set up and the server is reachable."
    exit 1
fi
echo "✅ Connection successful!"

# ── Sync project files to remote ─────────────────────────────
echo ""
echo "📁 Syncing project files to ${REMOTE_SERVER}:${REMOTE_DIR}..."
rsync -rlv --delete \
    --exclude='node_modules' \
    --exclude='dist' \
    --exclude='.git' \
    --exclude='.yarn/cache' \
    --exclude='.pnp.cjs' \
    --exclude='.pnp.loader.mjs' \
    --exclude='*.DS_Store' \
    --exclude='*.tmp' \
    --exclude='*.log' \
    -e ssh \
    ./ "${REMOTE_SERVER}:${REMOTE_DIR}/"

echo "✅ Files synced!"

# ── Upload the correct .env file ─────────────────────────────
echo ""
echo "🔑 Uploading ${ENV_FILE} as .env to remote..."
scp "${ENV_FILE}" "${REMOTE_SERVER}:${REMOTE_DIR}/.env"
echo "✅ .env uploaded!"

# ── Remote: docker compose up --build ────────────────────────
echo ""
echo "🐳 Building and starting Docker container on remote..."
ssh "${REMOTE_SERVER}" bash << REMOTE_EOF
    set -e
    cd "${REMOTE_DIR}"

    echo "🔄 Pulling latest base images..."
    docker compose pull --ignore-buildable 2>/dev/null || true

    echo "🏗️  Building image and starting service..."
    docker compose --env-file .env up --build -d

    echo "🧹 Removing dangling images..."
    docker image prune -f

    echo "📋 Running containers:"
    docker compose ps
REMOTE_EOF

echo ""
echo "🚀 Deployment successful!"
echo "🔗 UI accessible at: http://<server-ip>:${PM2_PORT}"
