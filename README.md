# DISHA — mammo-global

> **Central Federated Learning Coordinator & Admin Dashboard**
>
> mammo-global is the cloud-hosted brain of the DISHA platform. It receives encrypted, privacy-preserving model updates from all hospital nodes, aggregates them into a stronger global AI model, and displays real-time network health on a professional admin dashboard — all without ever seeing a single patient image.

---

## What Does This Do?

Think of mammo-global as the **coordinator** in a team project. Each hospital (node) does its own work locally, then sends only a summary of what it learned — never the raw data. mammo-global collects these summaries, combines them intelligently, and sends the improved model back. This is **Federated Learning**.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Hospital Nodes                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ AIIMS Nagpur │  │ GMCH Nagpur  │  │ Tata Memorial│  │
│  │ mammo-server │  │ mammo-server │  │ mammo-server │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
│         │ DP-noised        │ DP-noised        │ DP-noised│
│         │ weight delta     │ weight delta     │ weight   │
└─────────┼──────────────────┼──────────────────┼─────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────┐
│                   mammo-global (:3001)                   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  /api/fl/receive-weights                        │   │
│  │  • Byzantine anomaly detection                  │   │
│  │  • Coordinate-wise median aggregation           │   │
│  │  • New FL Round recorded to MongoDB             │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Admin Dashboard (/dashboard)                   │   │
│  │  • Live accuracy charts                         │   │
│  │  • Hospital node status                         │   │
│  │  • FL round history                             │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
                   MongoDB Atlas
               (rounds + hospitals)
```

---

## Technology Stack

| Technology | Purpose |
|---|---|
| **Next.js 14** (App Router) | Full-stack framework — API routes + React UI |
| **React 18** | Admin dashboard components |
| **MongoDB Atlas** | Stores FL rounds and hospital telemetry |
| **Mongoose** | Database schema definitions |
| **Recharts** | Accuracy progression charts |
| **bcryptjs** | Password hashing |
| **jsonwebtoken** | JWT authentication |

---

## Features

### 1. Federated Learning Aggregation
- Receives weight deltas from hospital nodes via `POST /api/fl/receive-weights`
- Aggregates using **coordinate-wise median** (Byzantine-robust — protects against malicious nodes)
- Detects and excludes anomalous weight submissions automatically
- Records each aggregation as a numbered FL Round in MongoDB

### 2. Admin Dashboard
- Real-time KPI cards: Total Hospitals, Samples Trained, FL Rounds, Global Accuracy
- Line chart showing model accuracy progression across all rounds
- Hospital contribution leaderboard with progress bars
- Per-hospital scan breakdown (bar chart)
- Node distribution map of India
- FL Training Simulator for demonstrations

### 3. Hospital Portal
- Doctors log in using their DISHA client credentials
- Upload mammogram datasets (ZIP or individual images, up to 500 images)
- Real-time training progress tracker (6-step checklist)
- Post-training results with SHA-256 weight hash as cryptographic privacy proof

### 4. Two-Tier Authentication
- **Tier 1:** Doctors authenticate using their existing `mammo-client` email and password (cross-database verification)
- **Tier 2:** Hospitals registered directly via the portal use hospital ID + password
- Both issue short-lived JWTs (8 hours) that can be invalidated on logout

---

## Security Features

### Authentication
| Feature | Detail |
|---|---|
| JWT with JTI | Every token has a unique ID for individual revocation |
| Token denylist | Logged-out tokens are rejected immediately, not just at expiry |
| Logout endpoint | `POST /api/auth/logout` — invalidates the current session |
| bcrypt hashing | All passwords hashed with cost factor 12 |
| No auto-admin | Admin accounts must be seeded explicitly via script |

### API Protection
| Feature | Detail |
|---|---|
| Rate limiting | 8 attempts/minute per IP on login endpoints (returns HTTP 429) |
| JWT verification | Every protected route verifies signature + denylist |
| Input validation | Request bodies validated before DB operations |
| No ReDoS | All database queries use exact matches, not user-supplied regex |

### HTTP Security Headers
| Header | Value | Protects Against |
|---|---|---|
| `X-Frame-Options` | `DENY` | Clickjacking |
| `X-Content-Type-Options` | `nosniff` | MIME sniffing attacks |
| `X-XSS-Protection` | `1; mode=block` | Reflected XSS |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Referrer leakage |
| `Permissions-Policy` | camera/mic/geo disabled | Browser API abuse |
| `Content-Security-Policy` | Restricts script/connect origins | XSS, data exfiltration |

### Federated Learning Security
| Feature | Detail |
|---|---|
| Byzantine-robust aggregation | Coordinate-wise median replaces FedAvg — robust to 50% malicious nodes |
| Anomaly detection | Nodes deviating >3× average from median are flagged and excluded |
| No patient data | Only weight deltas transmitted — never images, names, or diagnoses |

---

## API Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/login` | None | Admin login |
| `POST` | `/api/auth/logout` | JWT | Revoke current token |
| `POST` | `/api/hospital-auth/login` | None | Hospital/doctor login |
| `POST` | `/api/fl/receive-weights` | None* | Receive weight delta from hospital node |
| `GET` | `/api/hospitals` | JWT | List all hospital nodes |
| `GET` | `/api/rounds` | JWT | List all FL rounds |
| `GET` | `/api/stats` | JWT | Dashboard statistics |
| `POST` | `/api/hospital-auth/upload-and-train` | JWT | Proxy upload to local mammo-server |
| `POST` | `/api/hospital-auth/simulate-training` | JWT | Admin simulation tool |

> *Weight submission endpoint authenticated by mammo-server's X-API-Key in production

---

## Setup & Running

### Prerequisites
- Node.js 18+
- MongoDB Atlas account (free tier works)
- mammo-server running locally (optional — simulation fallback works without it)

### Installation

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local
# Edit .env.local with your values

# Create the admin account (first time only)
ADMIN_EMAIL=admin@disha.gov.in ADMIN_PASSWORD=yourpassword \
  npx ts-node scripts/seed-admin.ts

# Start development server
npm run dev   # Runs on http://localhost:3001
```

### Environment Variables

| Variable | Required | Description |
|---|---|---|
| `MONGODB_URI` | Yes | MongoDB Atlas connection string for mammo-global |
| `MAMMO_CLIENT_URI` | Yes | MongoDB connection string for mammo-client (doctor auth) |
| `JWT_SECRET` | Yes | 64-character random hex string for signing tokens |
| `MAMMO_SERVER_URL` | No | Local mammo-server URL (default: `http://localhost:8000`) |
| `MAMMO_NODE_API_KEY` | No | Shared API key with mammo-server for endpoint auth |

**Generate secure values:**
```bash
# JWT_SECRET
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# MAMMO_NODE_API_KEY
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Database Models

### Round (FL History)
```typescript
{
  roundNumber:       number,   // 1, 2, 3...
  accuracy:          number,   // 0.921 = 92.1%
  participants:      number,   // hospitals in this round
  hospitalIds:       string[], // ["AIIMS_NAGPUR", "GMCH_NAGPUR"]
  modelVersion:      string,   // "ResNet50-v2.0"
  sampleCount:       number,   // total images trained on
  aggregationMethod: string,   // "Coordinate-Wise Median (Byzantine-robust)"
  completedAt:       Date
}
```

### Hospital (Node Registry)
```typescript
{
  hospitalId:         string,  // "AIIMS_NAGPUR"
  name:               string,  // "AIIMS Nagpur"
  location:           string,  // "Nagpur, Maharashtra"
  status:             string,  // "online" | "offline"
  totalScans:         number,  // cumulative images trained
  benignCount:        number,
  malignantCount:     number,
  roundsParticipated: number,
  lastSeen:           Date     // updated every 30s by heartbeat
}
```

---

## Frequently Asked Questions

**Q: Does mammo-global ever see patient mammogram images?**
> Never. Only weight deltas (arrays of floating point numbers), accuracy values, and sample counts are transmitted. No images, no patient names, no diagnoses. This is the core privacy guarantee of Federated Learning.

**Q: What happens if a hospital sends malicious weights?**
> The coordinate-wise median aggregation detects anomalous submissions. Any hospital node whose weights deviate more than 3× the network average from the median is automatically flagged and excluded from that round. This protects against Byzantine/poisoning attacks.

**Q: What if mammo-server is offline when a doctor uploads?**
> The portal falls back to a statistically valid simulation — it generates a realistic accuracy improvement and SHA-256 weight hash. The dashboard remains fully functional for demonstrations.

**Q: Why is the JWT expiry only 8 hours?**
> Medical data systems require short session lifetimes to limit the window of exposure from stolen tokens. Combined with the token denylist (immediate revocation on logout), this minimizes risk from compromised credentials.
