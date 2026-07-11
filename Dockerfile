# ─────────────────────────────────────────────
# Stage 1: Build
# ─────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Accept build-time VITE_ env vars (baked into the static bundle by Vite)
ARG VITE_GOOGLE_MAP_API
ARG VITE_SERVER_TYPE
ARG VITE_API_BASE_URL
ARG VITE_DASHCAM_API_URL
ARG VITE_DASHCAM_WS_URL
ARG VITE_WS_URL
ARG VITE_OBD_API_URL
ARG VITE_LOGS_API_URL
ARG VITE_GRAPHQL_URL

ENV VITE_GOOGLE_MAP_API=$VITE_GOOGLE_MAP_API
ENV VITE_SERVER_TYPE=$VITE_SERVER_TYPE
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_DASHCAM_API_URL=$VITE_DASHCAM_API_URL
ENV VITE_DASHCAM_WS_URL=$VITE_DASHCAM_WS_URL
ENV VITE_WS_URL=$VITE_WS_URL
ENV VITE_OBD_API_URL=$VITE_OBD_API_URL
ENV VITE_LOGS_API_URL=$VITE_LOGS_API_URL
ENV VITE_GRAPHQL_URL=$VITE_GRAPHQL_URL

# Copy package files
COPY package.json yarn.lock ./
COPY .yarn ./.yarn

# Install dependencies (try yarn first, fall back to npm)
RUN corepack enable && yarn install --immutable || npm install

# Copy rest of source
COPY . .

# Build static assets
RUN yarn build || npm run build

# ─────────────────────────────────────────────
# Stage 2: Serve with Nginx on port 4173
# ─────────────────────────────────────────────
FROM nginx:stable-alpine AS runner

RUN rm /etc/nginx/conf.d/default.conf

COPY nginx.conf /etc/nginx/conf.d/app.conf

COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 4173

CMD ["nginx", "-g", "daemon off;"]
