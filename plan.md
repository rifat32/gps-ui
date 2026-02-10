# Media Server Implementation Plan

## Video Processing, Live Streaming & AI Dashcam Integration

**Document Version**: 1.0
**Created**: February 10, 2026
**Status**: Planning Phase

---

## 📋 Executive Summary

This document outlines the plan for implementing a **separate media server** to handle:

- Video stream processing (JTT1078 protocol)
- Live video streaming to clients
- AI dashcam data processing (ADAS, DSM, BSD, TPMS)
- Video recording and storage
- Real-time alerts from AI events

**Goal**: Create a scalable, high-performance media server that integrates seamlessly with the existing gateway service while maintaining separation of concerns.

---

## 🎯 Objectives

### Primary Goals

1. ✅ Process JTT1078 video streams from dashcams
2. ✅ Enable live video streaming to web/mobile clients
3. ✅ Handle AI dashcam data (ADAS, DSM, BSD alerts)
4. ✅ Record and store video footage
5. ✅ Provide low-latency video playback
6. ✅ Support multiple concurrent video streams

### Performance Targets

- **Latency**: < 2 seconds for live streams
- **Concurrent Streams**: 100+ simultaneous connections
- **Storage**: Efficient compression with configurable retention
- **Scalability**: Horizontal scaling support
- **Availability**: 99.9% uptime

---

## 🏗️ Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────┐
│                     CLIENT LAYER            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Web App  │  │ Mobile   │  │ Desktop  │   │
│  │ (WebRTC) │  │ (RTMP)   │  │ (HLS)    │   │
│  └─────┬────┘  └─────┬────┘  └─────┬────┘   │
└────────┼─────────────┼─────────────┼────────┘
         │             │             │
         └─────────────┴─────────────┘
                       │
         ┌─────────────▼─────────────┐
         │   API GATEWAY (Optional)  │
         │   - Load Balancing        │
         │   - Authentication        │
         └─────────────┬─────────────┘
                       │
         ┌─────────────▼────────────────────────────────────┐
         │           MEDIA SERVER CLUSTER                   │
         │                                                  │
         │  ┌──────────────────┐    ┌────────────────────┐  │
         │  │ Stream Manager   │◄──►│ Recording Service  │  │
         │  │ - Protocol Conv. │    │ - MP4/FLV Storage  │  │
         │  │ - Transcoding    │    │ - Retention Policy │  │
         │  └────────┬─────────┘    └─────────┬──────────┘  │
         │           │                         │            │
         │  ┌────────▼─────────┐    ┌────────▼──────────┐   │
         │  │ JTT1078 Decoder  │    │ AI Event Handler  │   │
         │  │ - Video Frames   │    │ - ADAS Processing │   │
         │  │ - Audio Frames   │    │ - DSM Alerts      │   │
         │  └────────┬─────────┘    │ - BSD Warnings    │   │
         │           │              └───────────────────┘   │
         │  ┌────────▼──────────────────────────────────┐   │
         │  │  WebRTC/RTMP/HLS Server                   │   │
         │  │  - Live Streaming                         │   │
         │  │  - Playback                               │   │
         │  └───────────────────────────────────────────┘   │
         └────────────┬─────────────────────────────────────┘
                      │
         ┌────────────▼───────────┐
         │      STORAGE LAYER     │
         │  ┌──────────────────┐  │
         │  │ Object Storage   │  │
         │  │ (S3/MinIO)       │  │
         │  └──────────────────┘  │
         │  ┌──────────────────┐  │
         │  │ Redis Cache      │  │
         │  │ - Stream Meta    │  │
         │  └──────────────────┘  │
         │  ┌──────────────────┐  │
         │  │ Database         │  │
         │  │ - Video Metadata │  │
         │  │ - AI Events      │  │
         │  └──────────────────┘  │
         └────────────────────────┘

         ┌────────────────────────────────────────┐
         │               DEVICE LAYER             │
         │  ┌──────────────┐    ┌──────────────┐  │
         │  │ AI Dashcams  │    │ Regular Cams │  │
         │  │ (JTT1078)    │    │ (JTT1078)    │  │
         │  └──────┬───────┘    └──────┬───────┘  │
         └─────────┼───────────────────┼──────────┘
                   │                   │
                   └──────────┬────────┘
                              │
         ┌────────────────────▼─────────────────────┐
         │    EXISTING GATEWAY SERVICE              │
         │  - TCP Server (Port 6801)                │
         │  - Protocol Detection                    │
         │  - JTT1078 Stream Forwarding             │
         └──────────────────────────────────────────┘
```

### System Components

#### 1. Media Server Core

- **Purpose**: Central video processing hub
- **Technology**: Node.js + Media frameworks
- **Responsibilities**:
  - JTT1078 protocol decoding
  - Stream transcoding
  - Format conversion (JTT1078 → WebRTC/RTMP/HLS)
  - Connection management

#### 2. Gateway Service (Existing)

- **Current Role**: TCP connection handler
- **New Role**: Stream router
- **Changes Needed**:
  - Detect JTT1078 packets
  - Forward video streams to media server
  - Handle device registration
  - Maintain session management

#### 3. Storage Services

- **Video Storage**: Object storage (S3/MinIO)
- **Metadata DB**: PostgreSQL/MongoDB
- **Cache**: Redis for hot data

#### 4. AI Processing Pipeline

- **ADAS Module**: Lane departure, collision warning
- **DSM Module**: Driver drowsiness, distraction detection
- **BSD Module**: Blind spot detection
- **Event Manager**: Alert routing and notification

---

## 🛠️ Technology Stack Recommendations

### Core Media Processing

#### Option 1: Node.js + MediaSoup (Recommended)

**Pros:**

- ✅ Excellent WebRTC support
- ✅ TypeScript/JavaScript (matches existing stack)
- ✅ SFU architecture for scalability
- ✅ Active community and support
- ✅ Lower latency

**Cons:**

- ❌ More complex initial setup
- ❌ Requires codec expertise

**Use Case:** Real-time live streaming with WebRTC

#### Option 2: Node.js + FFmpeg

**Pros:**

- ✅ Powerful transcoding
- ✅ Wide format support
- ✅ Battle-tested
- ✅ Easy integration via fluent-ffmpeg

**Cons:**

- ❌ Higher resource usage
- ❌ Higher latency
- ❌ Not ideal for real-time streaming

**Use Case:** Recording, playback, VOD

### Recommended Hybrid Approach

```
┌─────────────────────────────────────┐
│  MediaSoup (Node.js)                │  ← Live Streaming (WebRTC)
│  - Real-time WebRTC                 │
│  - Low latency                      │
└──────────┬──────────────────────────┘
           │
┌──────────▼──────────────────────────┐
│  FFmpeg Worker Pool                 │  ← Recording & Transcoding
│  - Recording to disk                │
│  - Format conversion                │
│  - Thumbnail generation             │
└─────────────────────────────────────┘
```

### Supporting Technologies

| Component         | Technology             | Purpose                     |
| ----------------- | ---------------------- | --------------------------- |
| **Streaming**     | MediaSoup + WebRTC     | Real-time live video        |
| **Recording**     | FFmpeg                 | Save streams to disk        |
| **Storage**       | MinIO (S3-compatible)  | Object storage for videos   |
| **Database**      | PostgreSQL             | Metadata, events, devices   |
| **Cache**         | Redis                  | Stream state, session data  |
| **Message Queue** | RabbitMQ/Redis Streams | AI event distribution       |
| **CDN**           | CloudFlare/CloudFront  | Video delivery (production) |

---

## 📋 Implementation Phases

### Phase 1: Foundation (Weeks 1-2)

#### 1.1 Project Setup

- [ ] Create `media-server` directory
- [ ] Initialize Node.js + TypeScript project
- [ ] Setup project structure
- [ ] Configure build tools

**Files to Create:**

```
media-server/
├── src/
│   ├── app.ts
│   ├── server.ts
│   ├── config/
│   ├── protocols/
│   │   └── jtt1078/
│   ├── services/
│   │   ├── stream.service.ts
│   │   ├── recording.service.ts
│   │   └── ai.service.ts
│   ├── routes/
│   └── utils/
├── package.json
├── tsconfig.json
└── README.md
```

#### 1.2 JTT1078 Protocol Implementation

- [ ] Implement JTT1078 packet parser
- [ ] Handle video frame extraction
- [ ] Implement audio frame extraction
- [ ] Test with real dashcam data

**Key Message Types:**

- `0x1205`: Terminal upload audio/video attributes
- `0x1206`: Terminal upload audio/video data
- `0x9101`: Real-time audio/video request
- `0x9102`: Audio/video control

#### 1.3 Basic Stream Management

- [ ] Create stream registry
- [ ] Implement session management
- [ ] Add connection lifecycle handlers
- [ ] Setup stream metadata storage

**Deliverables:**

- Working JTT1078 decoder
- Basic stream receiving capability
- Connection management system

---

### Phase 2: Live Streaming (Weeks 3-4)

#### 2.1 MediaSoup Integration

- [ ] Install and configure MediaSoup
- [ ] Create worker pool
- [ ] Setup routers and transports
- [ ] Implement WebRTC signaling

#### 2.2 Stream Pipeline

- [ ] JTT1078 → RTP conversion
- [ ] Setup video codecs (H.264, H.265)
- [ ] Setup audio codecs (G.711, AAC)
- [ ] Implement bitrate adaptation

#### 2.3 Client API

- [ ] WebRTC offer/answer endpoints
- [ ] ICE candidate exchange
- [ ] Stream listing API
- [ ] Stream control API (play/pause)

**API Endpoints:**

```
POST   /api/streams/start          # Start streaming session
POST   /api/streams/:id/connect    # WebRTC connection
GET    /api/streams/active         # List active streams
DELETE /api/streams/:id            # Stop stream
```

**Deliverables:**

- Live video streaming to web browser
- WebRTC peer connection handling
- Stream quality management

---

### Phase 3: Recording & Storage (Weeks 5-6)

#### 3.1 Recording Service

- [ ] Implement FFmpeg wrapper
- [ ] Create recording worker pool
- [ ] Setup HLS/DASH segment generation
- [ ] Implement recording scheduler

#### 3.2 Storage Integration

- [ ] Setup MinIO/S3 client
- [ ] Implement video upload pipeline
- [ ] Create retention policy manager
- [ ] Add thumbnail generation

#### 3.3 Playback Service

- [ ] VOD endpoint implementation
- [ ] HLS manifest generation
- [ ] Segment serving
- [ ] Seek functionality

**Recording Formats:**

- **Live**: MP4 segments (5 minutes each)
- **Archive**: MP4 compressed
- **HLS**: .m3u8 + .ts segments

**Deliverables:**

- Video recording to disk/object storage
- Playback API for recorded videos
- Thumbnail previews

---

### Phase 4: AI Dashcam Integration (Weeks 7-8)

#### 4.1 JSATL Protocol Extension

- [ ] Enhance ADAS decoder (existing)
- [ ] Enhance DSM decoder (existing)
- [ ] Enhance BSD decoder (existing)
- [ ] Add TPMS decoder (existing)

#### 4.2 AI Event Pipeline

- [ ] Create event processing queue
- [ ] Implement alert rules engine
- [ ] Add real-time notification system
- [ ] Setup event storage

#### 4.3 Event Correlation

- [ ] Link video clips with AI events
- [ ] Create event timeline
- [ ] Generate event reports
- [ ] Implement video snippet extraction

**AI Event Types:**

```typescript
interface AIEvent {
  type: "ADAS" | "DSM" | "BSD" | "TPMS";
  severity: "info" | "warning" | "critical";
  timestamp: Date;
  deviceId: string;
  videoStreamId?: string;
  videoClipUrl?: string;
  metadata: {
    // Event-specific data
    adas?: {
      eventType: "lane_departure" | "collision_warning" | "pedestrian";
      speed: number;
      distance?: number;
    };
    dsm?: {
      eventType: "drowsiness" | "distraction" | "phone_usage";
      confidence: number;
    };
    bsd?: {
      side: "left" | "right";
      distance: number;
    };
  };
}
```

**Deliverables:**

- AI event processing pipeline
- Alert notification system
- Video clips associated with events

---

### Phase 5: Integration & Testing (Weeks 9-10)

#### 5.1 Gateway Integration

- [ ] Update gateway to forward JTT1078 streams
- [ ] Implement stream routing logic
- [ ] Add device-to-stream mapping
- [ ] Setup inter-service communication

**Changes to Gateway:**

```typescript
// src/plugins/tcp-server.plugin.ts
if (protocol === "jtt1078") {
  // Forward to media server
  await mediaClient.forwardStream(deviceId, socket);
} else {
  // Handle normally (JTT808)
  // ... existing code
}
```

#### 5.2 Testing

- [ ] Unit tests for decoders
- [ ] Integration tests for streaming
- [ ] Load testing (100+ concurrent streams)
- [ ] Latency benchmarking
- [ ] AI event accuracy testing

#### 5.3 Monitoring & Observability

- [ ] Add Prometheus metrics
- [ ] Setup Grafana dashboards
- [ ] Implement health checks
- [ ] Add error tracking (Sentry)

**Key Metrics:**

- Active stream count
- Bandwidth usage per stream
- Latency (end-to-end)
- Frame drop rate
- Recording failures
- Storage usage

**Deliverables:**

- Fully integrated system
- Comprehensive test suite
- Monitoring dashboards

---

### Phase 6: Production Readiness (Weeks 11-12)

#### 6.1 Scalability

- [ ] Horizontal scaling setup
- [ ] Load balancer configuration
- [ ] Stateless session management
- [ ] Distributed recording

#### 6.2 Security

- [ ] JWT authentication for streams
- [ ] HTTPS/WSS enforcement
- [ ] TURN server setup (NAT traversal)
- [ ] Video encryption at rest

#### 6.3 Deployment

- [ ] Docker containerization
- [ ] Kubernetes manifests
- [ ] CI/CD pipeline
- [ ] Blue-green deployment

#### 6.4 Documentation

- [ ] API documentation (OpenAPI)
- [ ] Architecture diagrams
- [ ] Deployment guide
- [ ] Troubleshooting guide

**Deliverables:**

- Production-ready media server
- Deployment automation
- Complete documentation

---

## 🔌 Integration Points

### 1. Gateway ↔ Media Server Communication

#### Option A: Direct TCP Forwarding

```typescript
// Gateway forwards raw JTT1078 stream
mediaServer.connect(deviceId, socket);
```

**Pros:** Simple, low overhead
**Cons:** Tight coupling

#### Option B: Message Queue (Recommended)

```typescript
// Gateway publishes to Redis/RabbitMQ
redis.publish("video:stream:start", {
  deviceId: "291078985963",
  protocol: "jtt1078",
  endpoint: "tcp://gateway:6801",
});

// Media server subscribes and pulls stream
mediaServer.subscribe("video:stream:start", async (msg) => {
  await streamService.connect(msg.deviceId, msg.endpoint);
});
```

**Pros:** Loose coupling, scalable
**Cons:** Additional dependency

#### Option C: HTTP/gRPC API

```typescript
// Gateway calls media server API
await mediaServerClient.startStream({
  deviceId: "291078985963",
  protocol: "jtt1078",
  streamUrl: "tcp://gateway:6801/stream/123",
});
```

**Pros:** Clear interface, RESTful
**Cons:** HTTP overhead

**Recommendation:** Use **Option B (Message Queue)** for production scalability.

### 2. AI Events → Application

```typescript
// Media server publishes AI events
eventBus.publish("ai:event", {
  type: "ADAS",
  deviceId: "291078985963",
  event: "collision_warning",
  severity: "critical",
  videoClip: "s3://bucket/clips/123.mp4",
  timestamp: "2026-02-10T12:00:00Z",
});

// Application subscribers
notifications.sendAlert(event);
database.saveEvent(event);
analytics.trackEvent(event);
```

### 3. Video Storage → Client Playback

```
Client Request
      ↓
  Media Server API
      ↓
 Generate Signed URL (S3)
      ↓
  Return URL to Client
      ↓
Client plays directly from S3/CDN
```

---

## 💾 Database Schema

### Videos Table

```sql
CREATE TABLE videos (
  id UUID PRIMARY KEY,
  device_id VARCHAR(50) NOT NULL,
  stream_id VARCHAR(100) NOT NULL,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP,
  duration_seconds INTEGER,
  file_size_bytes BIGINT,
  storage_path TEXT NOT NULL,
  format VARCHAR(20) DEFAULT 'mp4',
  codec VARCHAR(20),
  resolution VARCHAR(20),
  fps INTEGER,
  bitrate INTEGER,
  thumbnail_url TEXT,
  status VARCHAR(20) DEFAULT 'recording', -- recording, completed, archived, deleted
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_videos_device_time ON videos(device_id, start_time DESC);
CREATE INDEX idx_videos_status ON videos(status);
```

### AI Events Table

```sql
CREATE TABLE ai_events (
  id UUID PRIMARY KEY,
  device_id VARCHAR(50) NOT NULL,
  event_type VARCHAR(50) NOT NULL, -- ADAS, DSM, BSD, TPMS
  event_subtype VARCHAR(50), -- lane_departure, drowsiness, etc.
  severity VARCHAR(20) NOT NULL, -- info, warning, critical
  timestamp TIMESTAMP NOT NULL,
  video_id UUID REFERENCES videos(id),
  video_clip_url TEXT,
  location_lat DECIMAL(10, 8),
  location_lon DECIMAL(11, 8),
  metadata JSONB,
  processed BOOLEAN DEFAULT FALSE,
  notification_sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_ai_events_device_time ON ai_events(device_id, timestamp DESC);
CREATE INDEX idx_ai_events_type ON ai_events(event_type);
CREATE INDEX idx_ai_events_severity ON ai_events(severity);
CREATE INDEX idx_ai_events_processed ON ai_events(processed);
```

### Streams Table (Active Sessions)

```sql
CREATE TABLE active_streams (
  id UUID PRIMARY KEY,
  device_id VARCHAR(50) NOT NULL UNIQUE,
  stream_type VARCHAR(20) NOT NULL, -- live, playback
  protocol VARCHAR(20) NOT NULL, -- jtt1078, rtsp, etc.
  status VARCHAR(20) DEFAULT 'active', -- active, paused, stopped
  viewer_count INTEGER DEFAULT 0,
  started_at TIMESTAMP NOT NULL,
  last_activity TIMESTAMP NOT NULL,
  bitrate INTEGER,
  resolution VARCHAR(20),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_active_streams_device ON active_streams(device_id);
CREATE INDEX idx_active_streams_status ON active_streams(status);
```

---

## 🔐 Security Considerations

### 1. Authentication & Authorization

- JWT tokens for API access
- Device-specific stream tokens
- Role-based access control (RBAC)
- Stream access permissions

### 2. Video Encryption

- Encryption at rest (AES-256)
- TLS/DTLS for transmission
- Signed URLs for playback (expiring tokens)

### 3. Rate Limiting

- API rate limits per client
- Stream connection limits per device
- Bandwidth throttling

### 4. Privacy Compliance

- Video retention policies (GDPR)
- Configurable auto-deletion
- Access logging and audit trails
- Data anonymization options

---

## 📊 Performance Optimization

### 1. Stream Quality Adaptation

```typescript
const qualityProfiles = {
  high: { width: 1920, height: 1080, bitrate: 4000, fps: 30 },
  medium: { width: 1280, height: 720, bitrate: 2000, fps: 25 },
  low: { width: 640, height: 480, bitrate: 800, fps: 15 },
};
```

### 2. Caching Strategy

- Redis cache for active stream metadata
- CDN caching for HLS segments
- Thumbnail caching
- API response caching

### 3. Resource Management

- Worker pool for FFmpeg processes
- MediaSoup worker distribution
- Connection pooling for databases
- Graceful stream cleanup

### 4. Network Optimization

- WebRTC ICE/STUN/TURN optimization
- Bandwidth estimation
- Adaptive bitrate streaming
- Packet loss recovery

---

## 💰 Cost Estimation

### Infrastructure (Monthly - Medium Scale)

| Component             | Specs              | Cost (USD) |
| --------------------- | ------------------ | ---------- |
| Media Server (x2)     | 8 vCPU, 16GB RAM   | $300       |
| Storage (S3/MinIO)    | 10TB + 1M requests | $230       |
| Database (PostgreSQL) | 4 vCPU, 8GB RAM    | $150       |
| Redis Cache           | 4GB memory         | $50        |
| Message Queue         | Standard tier      | $30        |
| CDN (Video Delivery)  | 5TB transfer       | $425       |
| **Total Estimate**    |                    | **$1,185** |

### Scaling Factors

- **100 concurrent streams**: ~$1,200/month
- **500 concurrent streams**: ~$4,500/month
- **1000+ concurrent streams**: ~$10,000+/month

---

## 🚨 Risks & Mitigation

### Technical Risks

| Risk                    | Impact | Mitigation                                   |
| ----------------------- | ------ | -------------------------------------------- |
| High bandwidth costs    | High   | Implement adaptive quality, caching          |
| Storage costs escalate  | High   | Auto-deletion policies, compression          |
| Latency > 2s            | Medium | Use WebRTC, optimize transcoding             |
| Scalability bottlenecks | High   | Horizontal scaling, load testing             |
| JTT1078 complexity      | Medium | Incremental implementation, testing          |
| AI model accuracy       | Low    | Use existing JSATL decoders, tune thresholds |

### Operational Risks

| Risk                      | Impact | Mitigation                            |
| ------------------------- | ------ | ------------------------------------- |
| Device compatibility      | Medium | Test with multiple dashcam brands     |
| Network interruptions     | Medium | Reconnection logic, buffer management |
| Security vulnerabilities  | High   | Regular audits, penetration testing   |
| Compliance (privacy laws) | High   | Legal review, retention policies      |

---

## 📅 Timeline Summary

| Phase                         | Duration     | Key Deliverables                       |
| ----------------------------- | ------------ | -------------------------------------- |
| **Phase 1: Foundation**       | 2 weeks      | JTT1078 decoder, basic stream handling |
| **Phase 2: Live Streaming**   | 2 weeks      | WebRTC streaming to clients            |
| **Phase 3: Recording**        | 2 weeks      | Video storage, playback                |
| **Phase 4: AI Integration**   | 2 weeks      | ADAS/DSM/BSD event processing          |
| **Phase 5: Testing**          | 2 weeks      | Integration, load testing              |
| **Phase 6: Production Ready** | 2 weeks      | Deployment, documentation              |
| **Total**                     | **12 weeks** | **Fully functional media server**      |

---

## 🎬 Quick Start (Phase 1)

### Step 1: Create Media Server Project

```bash
# Create new directory
mkdir media-server
cd media-server

# Initialize Node.js project
npm init -y

# Install dependencies
npm install fastify @fastify/cors \
  mediasoup fluent-ffmpeg \
  redis ioredis \
  pg @prisma/client \
  winston pino pino-pretty \
  dotenv dayjs

npm install -D typescript ts-node-dev \
  @types/node @types/fluent-ffmpeg
```

### Step 2: Basic Project Structure

```bash
mkdir -p src/{config,protocols/jtt1078,services,routes,utils}
touch src/app.ts src/server.ts
```

### Step 3: Implement JTT1078 Basic Decoder

```typescript
// src/protocols/jtt1078/decoder.ts
export interface JTT1078Packet {
  messageId: number;
  deviceId: string;
  streamType: "video" | "audio";
  dataType: number;
  timestamp: number;
  payload: Buffer;
}

export function decodeJTT1078(data: Buffer): JTT1078Packet {
  // Implementation based on JTT1078 spec
  // Message structure:
  // - Header (30 bytes)
  // - Body (variable)

  return {
    messageId: data.readUInt16BE(0),
    deviceId: extractDeviceId(data),
    streamType: determineStreamType(data),
    dataType: data.readUInt8(15),
    timestamp: data.readUInt32BE(16),
    payload: data.slice(30),
  };
}
```

### Step 4: Run in Development

```bash
npm run dev
```

---

## 📚 Additional Resources

### Documentation to Review

1. **JTT1078 Standard**: GB/T 28059-2021 (Chinese standard)
2. **MediaSoup**: https://mediasoup.org/documentation/
3. **WebRTC**: https://webrtc.org/getting-started/
4. **FFmpeg**: https://ffmpeg.org/documentation.html

### Existing Code to Leverage

- `src/protocols/jsatl/` - ADAS/DSM/BSD decoders
- `src/protocols/j42/` - Protocol handling patterns
- `src/core/sessionManager.ts` - Session management logic
- `src/services/device.service.ts` - Device registry patterns

---

## ✅ Success Criteria

### Minimum Viable Product (MVP)

- [ ] JTT1078 streams decoded successfully
- [ ] Live video viewable in browser via WebRTC
- [ ] Basic recording to disk/S3
- [ ] AI events (ADAS/DSM/BSD) processed and stored
- [ ] Stream list API functional
- [ ] Playback of recorded videos
- [ ] System handles 50+ concurrent streams
- [ ] Latency < 3 seconds

### Production Ready

- [ ] Latency < 2 seconds
- [ ] 100+ concurrent streams supported
- [ ] Horizontal scaling verified
- [ ] Full monitoring and alerting
- [ ] Complete API documentation
- [ ] Security audit passed
- [ ] Load testing completed
- [ ] Disaster recovery plan

---

## 🔄 Next Steps

### Immediate Actions (Week 1)

1. ✅ Review and approve this plan
2. ⏳ Provision development servers
3. ⏳ Setup development environment
4. ⏳ Create media-server repository
5. ⏳ Begin Phase 1 implementation

### Questions to Resolve

- [ ] Which cloud provider for production? (AWS, GCP, Azure)
- [ ] Budget approval for infrastructure?
- [ ] Compliance requirements for video storage?
- [ ] Preferred CDN provider?
- [ ] Team assignments for implementation?

---

## 📞 Stakeholders

| Role              | Responsibility                      | Contact |
| ----------------- | ----------------------------------- | ------- |
| Tech Lead         | Architecture decisions, code review | TBD     |
| Backend Developer | Media server implementation         | TBD     |
| DevOps Engineer   | Infrastructure, deployment          | TBD     |
| QA Engineer       | Testing, quality assurance          | TBD     |
| Product Manager   | Requirements, priorities            | TBD     |

---

**Document Status**: Ready for Review
**Next Review Date**: February 17, 2026
**Approved By**: [Pending]

---

_This is a living document and will be updated as the project progresses._
