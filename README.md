## 1. Project Title & Tagline

# Courier Flow

Multi-tenant logistics SaaS for managing shipments, hubs, and delivery agents with real-time tracking.

## 2. Overview

Courier Flow solves fragmented last-mile operations by unifying shipment creation, assignment, status updates, and public tracking in one platform.
It is built for logistics operators and courier companies running multiple teams/tenants.
The application is a full-stack Next.js SaaS with role-based access for Super Admin, Company Admin, and Agent users.
It includes JWT auth, tenant isolation, event timelines, real-time updates, and asynchronous email delivery.
The product also exposes public shipment tracking by tracking ID with QR support.

## 3. Tech Stack

- Framework: Next.js 16 (App Router), React 19
- Runtime/Data Layer: Next.js Route Handlers, Mongoose ODM
- Database: MongoDB
- Authentication: JWT (access + refresh tokens via HTTP-only cookies)
- Validation: Zod + React Hook Form
- Styling/UI: Tailwind CSS v4 + custom component system
- Real-time: Pusher (server + browser client)
- Caching: Upstash Redis
- Async Jobs/Webhook: Upstash QStash
- File/Media Storage: ImageKit
- Email: Nodemailer (QStash worker delivery)
- Mapping/Geo: Leaflet + React Leaflet
- Charts: Recharts
- QR: `qrcode` (generation) + `jsqr` (scan/parse)

## 4. Architecture Overview

The app uses Next.js App Router for page routing and Route Handlers for API endpoints under `app/api`.
Business logic and integrations are centralized in `lib/` (auth, db, jwt, cache, realtime, media, mail, ETA, tenant domain).
MongoDB is accessed via Mongoose models in `models/`, with tenant scoping on domain entities.
Authentication is cookie-based JWT; a central `proxy.js` enforces auth, RBAC, and injects user context headers.
Background email sending is queued from shipment status updates via QStash and processed by `/api/worker/send-email`.

```text
									COURIER FLOW SYSTEM ARCHITECTURE

  ┌────────────────────────────────────── Clients / UI Layer ───────────────────────────────────────┐
  │                                                                                                   │
  │  Public User (Track)        Company Admin (CA)          Agent (AG)           Super Admin (SA)    │
  │  - /track page              - /ca/* dashboards          - /ag/* mobile UI    - /sa/* control UI  │
  │  - QR scan + live status    - shipment ops              - status updates      - tenant/plan ops   │
  │                                                                                                   │
  └───────────────────────────────────────────────┬───────────────────────────────────────────────────┘
												  │ HTTP(S)
												  v
  ┌──────────────────────────────────── Next.js App Router (app/*) ──────────────────────────────────┐
  │  SSR/CSR Pages, role layouts, hooks (auth/pusher/geolocation), shared components                 │
  └───────────────────────────────────────────────┬───────────────────────────────────────────────────┘
												  │
												  v
  ┌──────────────────────────────────── Request Guard Layer (proxy.js) ───────────────────────────────┐
  │  - JWT cookie validation (access_token / refresh_token)                                            │
  │  - RBAC checks for /sa, /ca, /ag and protected APIs                                                │
  │  - In-memory rate limiting                                                                          │
  │  - Injects x-user-id, x-role, x-tenant-id headers for route handlers                              │
  └───────────────────────────────────────────────┬───────────────────────────────────────────────────┘
												  │
												  v
  ┌──────────────────────────────────── API Layer (app/api/*) ────────────────────────────────────────┐
	│  Auth: /api/auth/*                         Public: /api/public/plans, /api/track/*                │
	│  SA:   /api/sa/* (plans, tenants, analytics, audit logs)                                           │
	│  CA:   /api/ca/* (agents, hubs, shipments, assign-hub/assign-agent, events)                       │
	│  AG:   /api/ag/* (assigned shipments, status update, proof upload, location)                      │
	│  Shared: /api/upload, /api/notifications                                                           │
  │  Worker:/api/worker/send-email             (QStash-signed webhook consumer)                       │
  └───────────────────────────────────────────────┬───────────────────────────────────────────────────┘
												  │
												  v
  ┌────────────────────────────── Business / Domain Layer (lib/* + models/*) ─────────────────────────┐
  │  lib/auth.js         -> auth helpers, role guards, audit logging                                   │
  │  lib/jwt.js          -> sign/verify access + refresh tokens                                        │
  │  lib/validations.js  -> Zod request validation schemas                                              │
  │  lib/eta.js          -> delivery ETA prediction logic                                                │
  │  models/*            -> User, Tenant, Agent, Hub, Shipment, ShipmentEvent, Notification, AuditLog │
  └───────────────┬───────────────────────────┬───────────────────────────┬────────────────────────────┘
				  │                           │                           │
				  │                           │                           │
				  v                           v                           v
	 ┌───────────────────────┐    ┌─────────────────────────┐   ┌─────────────────────────┐
	 │ MongoDB (Mongoose)    │    │ Upstash Redis           │   │ Pusher                  │
	 │ - operational data     │    │ - plans/tenant caches   │   │ - live status events    │
	 │ - multi-tenant scope   │    │ - tracking cache        │   │ - live agent location   │
	 │ - shipment timeline    │    │ - analytics cache       │   │ - client subscriptions  │
	 └───────────────────────┘    └─────────────────────────┘   └─────────────────────────┘
				  │                           │                           │
				  └───────────────┬───────────┴───────────┬───────────────┘
								  │                       │
								  v                       v
					 ┌──────────────────────┐   ┌──────────────────────────┐
					 │ ImageKit             │   │ Upstash QStash           │
					 │ - QR/proof uploads   │   │ - async email enqueue    │
					 │ - upload signatures  │   │ - signed webhook delivery│
					 └──────────┬───────────┘   └──────────────┬───────────┘
								│                              │
								│                              v
								│                 ┌──────────────────────────┐
								│                 │ /api/worker/send-email   │
								│                 │ Nodemailer SMTP send      │
								│                 └──────────────┬───────────┘
								│                                │
								v                                v
					 ┌──────────────────────┐         ┌──────────────────────┐
					 │ Media URLs in UI     │         │ Receiver inboxes      │
					 │ (QR / POD rendering) │         │ (shipment updates)    │
					 └──────────────────────┘         └──────────────────────┘
```

## 5. Features

Super Admin (SA)
- Manage subscription plans (create, update, delete)
- Manage tenants (create/edit/delete, activate/suspend, assign plans)
- Platform analytics (tenant counts, shipment status distribution, growth)
- Audit log explorer with filters and pagination

Company Admin (CA)
- Tenant-scoped CRUD for agents and hubs
- Tenant-scoped shipment CRUD with filters, pagination, and search
- Shipment workflow: assign hub first, then assign available active agent
- Agent operations: toggle availability and view per-agent shipment history/summary
- QR code generation for each shipment tracking URL
- Shipment event timeline and proof-of-delivery visibility
- Operational dashboard with status charts and live agent map updates

Agent (AG)
- View assigned shipments only
- GPS location updates (periodic) to backend
- Status transition workflow with validation state machine
- Attach optional notes and geolocation during status updates
- Upload proof-of-delivery images (JPG/PNG/WebP, size limit enforced)
- Share customer-facing QR/public tracking link from shipment detail

Public
- Track shipment by tracking ID
- View timeline/history, current status, ETA, assigned hub, proof-of-delivery
- Live status/location updates via Pusher
- QR scanner support on tracking page (camera + jsQR fallback)

Cross-cutting
- JWT access/refresh auth flow with HTTP-only cookies
- Role-based route/API protection in `proxy.js`
- In-memory API rate limiting in `proxy.js`
- Redis caching for plans, tenants, analytics, shipment lists, and public tracking
- Async email notifications through QStash + worker signature verification
- In-app notification feed endpoint (`/api/notifications`) used by SA notification UI
- Tenant activity guard: creation operations blocked when tenant is suspended

## 6. Project Structure

```text
app/
├── api/            -> Route Handlers (auth, SA/CA/AG, tracking, upload, notifications, worker)
├── sa/             -> Super Admin pages
├── ca/             -> Company Admin pages
├── ag/             -> Agent pages
├── track/          -> Public tracking UI
├── login/          -> Login page
└── register/       -> Tenant self-registration page

lib/
├── db.js           -> MongoDB connection (Mongoose)
├── auth.js         -> Auth helpers, role guards, audit logging helpers
├── jwt.js          -> Access/refresh token sign + verify
├── redis.js        -> Upstash Redis client + fallback
├── qstash.js       -> Upstash QStash client
├── pusher.js       -> Pusher server client + fallback
├── imagekit.js     -> ImageKit client
├── mailer.js       -> Nodemailer transporter
├── eta.js          -> ETA calculation logic
├── tenantDomain.js -> Tenant domain normalization + unique domain generation
└── validations.js  -> Zod schemas

models/             -> Mongoose models (User, Tenant, Shipment, Agent, etc.)
components/         -> Shared and role UI components
hooks/              -> Client hooks (auth, geolocation, pusher)
proxy.js            -> Request proxy (auth, RBAC, rate limit, header injection)
```

## 7. Getting Started

### Prerequisites

- Node.js 20+
- MongoDB Atlas (or local MongoDB)
- Upstash Redis account (for caching)
- Upstash QStash account (for async worker jobs)
- ImageKit account (for QR/proof uploads)
- Pusher account (for real-time events)
- SMTP credentials (for outgoing email)

### Installation

```bash
git clone [repo-url]
cd saas2
npm install
```

### Environment Variables

```env
# Core app
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/courier-flow
JWT_ACCESS_SECRET=replace-with-strong-random-secret
JWT_REFRESH_SECRET=replace-with-strong-random-secret
NODE_ENV=development

# Public/base URLs
APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Upstash Redis (cache)
UPSTASH_REDIS_REST_URL=https://<instance>.upstash.io
UPSTASH_REDIS_REST_TOKEN=<upstash-redis-token>

# Upstash QStash (async jobs)
QSTASH_TOKEN=<qstash-token>
QSTASH_CURRENT_SIGNING_KEY=<qstash-current-signing-key>
QSTASH_NEXT_SIGNING_KEY=<qstash-next-signing-key>
# Optional: QSTASH_URL for local QStash dev server

# Pusher (real-time)
PUSHER_APP_ID=<pusher-app-id>
PUSHER_KEY=<pusher-key>
PUSHER_SECRET=<pusher-secret>
PUSHER_CLUSTER=ap2
NEXT_PUBLIC_PUSHER_KEY=<pusher-key>
NEXT_PUBLIC_PUSHER_CLUSTER=ap2

# ImageKit (media uploads and QR assets)
IMAGEKIT_PUBLIC_KEY=<imagekit-public-key>
IMAGEKIT_PRIVATE_KEY=<imagekit-private-key>
IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/<your-id>

# Email (Nodemailer / worker)
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_USER=<smtp-username>
EMAIL_PASS=<smtp-password>
EMAIL_FROM=no-reply@yourdomain.com
```

### Run Locally

```bash
npm run dev
```

Open http://localhost:3000

## 8. Test Credentials



## 9. API Documentation

```text
Postman Collection: [TO BE FILLED]
```

## 10. Deployed Link

```text
Live URL: https://courier-flow.vercel.app
```

## 11. Advanced Enhancements

- Real-Time GPS Tracking
	- Agent app captures coordinates (lat/lng) and sends them to `POST /api/ag/location`.
	- Backend persists latest agent location in MongoDB (`Agent.currentLocation`) and broadcasts updates via Pusher channels (`agent-location-{tenantId}` and `shipment-{trackingId}`).
	- Public tracking cache keys are invalidated so fresh movement is reflected immediately.
- AI-Based Delivery Prediction
	- ETA is computed through `calculateEstimatedDeliveryDate` in `lib/eta.js`.
	- Prediction logic uses lane classification (same city/state/cross state), parcel weight penalties, and retry/failure event penalties.
	- ETA is set at shipment creation and recalculated after operational status changes.
- Barcode / QR Code Scanning
	- Shipment creation generates a tracking QR image (`qrcode`), uploads it to ImageKit, and stores `qrCodeUrl` with shipment metadata.
	- Tracking page supports camera scan using `BarcodeDetector` when available, with `jsQR` canvas fallback for wider browser support.
	- Scanned/parsed values resolve tracking IDs and directly trigger tracking history/status fetch.
- Mobile-Friendly Delivery Agent Interface
	- Agent layout is mobile-first with sticky compact header, bottom tab navigation, and touch-friendly controls.
	- Agent flows are optimized for field usage: assigned shipment list, one-tap status transitions, GPS updates, and proof-of-delivery upload.
