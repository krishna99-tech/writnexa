# QUORIX

QUORIX is a production-grade technical publishing ecosystem engineered specifically for software developers, systems architects, engineering students, and open-source contributors.

It is structured as a **Go modular monolith** backend and a **Next.js 15+ App Router** frontend, sharing a single normalized PostgreSQL 16 database.

---

## Architecture & Design Documentation

All foundational blueprints and specifications are maintained in the [`docs/`](docs/) directory:

- [**docs/PROJECT.md**](docs/PROJECT.md): Product vision, target personas, three pillars (Explorer, Studio, Admin), non-negotiable platform rules.
- [**docs/ARCHITECTURE.md**](docs/ARCHITECTURE.md): System architecture diagrams, frontend App Router layout, Go modular monolith design, email outbox pattern, infrastructure.
- [**docs/DATABASE_DESIGN.md**](docs/DATABASE_DESIGN.md): PostgreSQL 16 Entity-Relationship Diagram (ERD), normalized schema specifications, indexes, and full-text search indexing.
- [**docs/API_DESIGN.md**](docs/API_DESIGN.md): Standardized JSON response envelopes, RESTful endpoint catalog, status codes.
- [**docs/DEVELOPMENT_ROADMAP.md**](docs/DEVELOPMENT_ROADMAP.md): Phase-by-phase execution plan and architectural risk register.

---

## Repository Structure

```
quorix/
├── backend/                  # Go 1.26+ Gin Modular Monolith Backend
│   ├── cmd/
│   │   ├── api/              # HTTP API entrypoint & graceful shutdown
│   │   └── migrate/          # Goose migration CLI runner
│   ├── internal/
│   │   ├── config/           # Strongly typed configuration via env
│   │   ├── database/         # pgxpool connection & Goose integration
│   │   ├── health/           # GET /health & GET /api/v1/health handlers
│   │   ├── logger/           # Structured logging via standard library log/slog
│   │   ├── middleware/       # CORS, RequestID, Slog logger, Panic recovery
│   │   ├── redis/            # Redis 7 client integration
│   │   └── response/         # Standardized JSON response envelopes
│   ├── migrations/           # Goose SQL migrations
│   ├── sqlc/                 # sqlc configuration and query definitions
│   ├── Dockerfile            # Multi-stage production build
│   └── Dockerfile.dev        # Development container build
├── frontend/                 # Next.js 15+ App Router TypeScript Frontend
│   ├── src/
│   │   ├── app/              # App router (globals.css, layout.tsx, page.tsx)
│   │   ├── components/ui/    # shadcn/ui primitives (button, badge, card)
│   │   └── lib/              # API client & tailwind utilities
│   ├── Dockerfile            # Multi-stage Next.js production build
│   └── Dockerfile.dev        # Development container build
├── docs/                     # Specifications and architectural blueprints
├── docker-compose.yml        # PostgreSQL 16, Redis 7, Mailpit, & App services
└── README.md
```

---

## Getting Started

### Prerequisites

- **Go**: 1.22+ (tested with Go 1.26)
- **Node.js**: 20+ (tested with Node 22)
- **Docker & Docker Compose**: (Optional for containerized PostgreSQL and Redis)

---

### Option A: Local Development (Native)

#### 1. Start Local Supporting Services
Start PostgreSQL 16, Redis 7, and Mailpit in the background:
```bash
docker compose up -d postgres redis mailpit
```

#### 2. Run the Go Backend
```bash
cd backend
cp .env.example .env
go run ./cmd/api
```
The backend starts on `http://localhost:8080`.
- Health Check: `http://localhost:8080/health`
- API v1 Health: `http://localhost:8080/api/v1/health`
- API Ping: `http://localhost:8080/api/v1/ping`

To run database migrations manually:
```bash
cd backend
go run ./cmd/migrate status
go run ./cmd/migrate up
```

#### 3. Run the Next.js Frontend
In a separate terminal:
```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```
The frontend opens on `http://localhost:3000`.

---

### Option B: Full-Stack Docker Compose

Run all services including Go backend and Next.js frontend in Docker:
```bash
docker compose --profile full-stack up --build
```
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:8080`
- Mailpit UI: `http://localhost:8025`

---

## Running Automated Tests

### Backend Tests
```bash
cd backend
go test -v ./...
```

### Frontend Build & Typecheck
```bash
cd frontend
npm run build
```
