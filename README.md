# IT Pros WordADay

A full-stack English vocabulary application designed for IT professionals. Learn a new word every day with context tailored to Cloud, Software Development, Design, Debugging, Security, AI/ML, DevOps, Project Management, and more.

**Live Demo**: [javakishore-veleti.github.io/ITProsWordADay](https://javakishore-veleti.github.io/ITProsWordADay/)

---

## What Makes This Different

Unlike generic vocabulary apps, every word includes:

- **IT Context** — How the word applies to your daily work (code reviews, sprint planning, architecture discussions)
- **Sample Phrases** — Real-world sentences from annual reviews, 1:1 meetings, tech talks, and JIRA comments
- **Alternative Words** — Synonyms to expand your professional vocabulary
- **Difficulty Ratings** — From Easy to Expert, so you can challenge yourself progressively

## Features

| Feature | Description |
|---|---|
| **Today's Word** | Featured word with the latest date, smart label ("Today's Word" or "Word from [date]") |
| **17 Genre Categories** | Cloud, Software Dev, Design, Debugging, Security, AI/ML, Data Science, DevOps, Project Management, Communication, Git, Appreciation, Annual Reviews, One-on-One, Story Telling, Data Engineering, IT Jokes |
| **1,700+ Words** | 100 words per genre with unique sample phrases and IT context |
| **Search** | Search by word, meaning, genre, or date — works from the nav bar and search page |
| **Sentence Analyzer** | Submit a sentence and get vocabulary upgrade suggestions |
| **Professional Speak** | Templates for JIRA comments, Slack messages, Git commits, and expressing frustration professionally |
| **Word Navigation** | Next/Previous word buttons with session history (avoids repeating the last 25 words) |
| **Difficulty Badges** | Visual difficulty indicators from Easy to Expert |
| **Privacy-First** | No user data stored. No tracking. No engagement traps. |

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 16, React, TypeScript, Tailwind CSS |
| **Backend** | Go (net/http), modular architecture |
| **Data Storage** | File-based JSON (genre-organized, max 1000 words per file) |
| **Caching** | In-memory cache with TTL (Redis-ready when deployed on AWS) |
| **Deployment** | GitHub Pages (static), Docker, GitHub Actions CI/CD |
| **Containerization** | Multi-stage Dockerfile (Go + Next.js + Alpine) |

## Architecture

```
ITProsWordADay/
├── Portals/EnglishWordADayPortal/     # Next.js frontend
│   ├── app/                           # App Router pages
│   │   ├── page.tsx                   # Dashboard with Today's Word
│   │   ├── genre/[slug]/             # Genre listing pages
│   │   ├── word/[id]/                # Word detail pages
│   │   ├── search/                   # Search page
│   │   ├── sentence/                 # Sentence analyzer
│   │   └── professional/             # Professional speak templates
│   ├── components/                    # Header, GenreIllustration
│   ├── hooks/                         # useWordRotation (Next/Prev navigation)
│   ├── lib/
│   │   ├── api.ts                    # API client (Go backend + static fallback)
│   │   ├── data.ts                   # Types, genres, constants
│   │   └── data.server.ts           # Server-only disk reader (SSG)
│   └── public/data/words/            # Static JSON for GitHub Pages fallback
│
├── Services/EnglishWordADayService/   # Go backend
│   ├── main.go                        # Entry point
│   ├── internal/
│   │   ├── config/                   # Environment-based configuration
│   │   ├── models/                   # Word, PaginatedResponse structs
│   │   ├── cache/                    # In-memory cache with TTL
│   │   ├── repository/              # File-based DB (reads JSON from disk)
│   │   ├── services/
│   │   │   ├── search/              # Word search & retrieval
│   │   │   └── rating/              # Difficulty rating
│   │   ├── api/
│   │   │   ├── handler/             # HTTP handlers (words, search, rating, health)
│   │   │   └── router/              # Route registration
│   │   └── middleware/              # CORS, request logging
│   └── data/words/                   # Genre-organized JSON word files
│
├── .github/workflows/                 # CI/CD (all manually triggered)
│   ├── 01-build.yml                  # Build frontend + backend
│   ├── 02-docker-build.yml          # Build & verify Docker image
│   ├── 03-deploy-github-pages.yml   # Deploy to GitHub Pages
│   └── 04-publish-dockerhub.yml     # Publish to Docker Hub
│
├── Dockerfile                         # Multi-stage production build
├── package.json                       # Root: start/stop/restart both services
└── CLAUDE.md                          # Project requirements & conventions
```

## Running Locally

### Prerequisites

- **Node.js** 20+
- **Go** 1.21+
- npm (comes with Node.js)

### Quick Start

```bash
# Install frontend dependencies
npm --prefix Portals/EnglishWordADayPortal install

# Start both frontend (port 3000) and backend (port 8080)
npm start
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Other Commands

```bash
# Stop both services
npm run stop

# Restart both services
npm run restart
```

### How It Works Locally

1. The Go backend starts on port 8080, loads all word JSON files into memory
2. The Next.js frontend starts on port 3000
3. The frontend API client pings `GET /api/health` — if the backend is up, all requests go through the Go API (paginated, fast)
4. If the backend is unreachable (GitHub Pages), it falls back to loading static JSON files

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health check with word count and config |
| `GET` | `/api/words?genre=cloud&page=1&pageSize=20` | Paginated word listing, filterable by genre |
| `GET` | `/api/word?id=cloud-001` | Single word by ID |
| `GET` | `/api/search?q=ephemeral&genre=cloud&date=2026-02-21` | Full-text search across words, meanings, phrases |
| `POST` | `/api/rate` | Rate a word's difficulty (`{ "id": "cloud-001", "rating": 4 }`) |

## Deployment

### GitHub Pages (Static)

The frontend is exported as static HTML and deployed via GitHub Actions:

1. Go to **Actions** > **"03 - Deploy to GitHub Pages"** > **Run workflow**
2. Ensure GitHub Pages source is set to **"GitHub Actions"** in repo Settings > Pages

Note: On GitHub Pages, the Go backend is not available. The frontend falls back to static JSON files bundled in the build.

### Docker

```bash
# Build the image (includes both Go backend and Next.js static files)
docker build -t itpros-wordaday .

# Run it
docker run -p 8080:8080 itpros-wordaday
```

The Go backend serves both the API and the static frontend from a single container.

### Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `8080` | Server port |
| `DEPLOYMENT_MODE` | `github-pages` | `github-pages` or `aws` |
| `DATA_ROOT_PATH` | `./data` | Path to word JSON files |
| `PAGE_SIZE` | `20` | Default pagination size |
| `ENABLE_REDIS` | `false` | Enable Redis caching (AWS mode) |
| `REDIS_ADDR` | `localhost:6379` | Redis address |

## Word Data Format

Words are stored as JSON files organized by genre:

```
data/words/
├── cloud/
│   └── words_001.json        # Up to 1000 words per file
├── software-dev/
│   └── words_001.json
├── story-telling/
│   └── words_001.json
└── ... (17 genres)
```

Each word entry:

```json
{
  "id": "cloud-001",
  "word": "Ephemeral",
  "meaning": "Lasting for a very short time; transient",
  "genre": "cloud",
  "difficulty": 3,
  "dateAdded": "2025-11-14",
  "samplePhrase": "Our ephemeral containers spin up on demand and terminate after processing.",
  "itContext": "In cloud computing, ephemeral resources reduce costs by existing only when needed.",
  "alternativeWords": ["transient", "temporary", "fleeting", "short-lived"],
  "pronunciation": "eh-FEM-er-ul",
  "partOfSpeech": "adjective",
  "ratings": [3, 4, 5]
}
```

## Genre Categories

| Genre | Words | Description |
|---|---|---|
| Cloud Computing | 100 | Cloud architecture and infrastructure vocabulary |
| Software Development | 100 | Core programming and development terms |
| Design & UX | 100 | Design thinking and user experience |
| Debugging & QA | 100 | Testing, debugging, and quality assurance |
| Security | 100 | Cybersecurity and data protection |
| AI & Machine Learning | 100 | AI and ML terminology |
| Data Science | 100 | Data analysis and statistical concepts |
| DevOps & SRE | 100 | Infrastructure, pipelines, and operations |
| Project Management | 100 | Agile, Scrum, and team management |
| Professional Communication | 100 | Express opinions and feelings professionally |
| Git & Version Control | 100 | Git workflows and commit conventions |
| Team Appreciation | 100 | Recognizing and appreciating colleagues |
| Annual Reviews | 100 | Performance reviews and self-assessments |
| Monthly One on One | 100 | Effective 1:1 conversations with managers |
| Story Telling | 91 | Narrative and presentation vocabulary |
| Data Engineering | 100 | ETL, pipelines, and data infrastructure |
| IT Jokes | 100 | Witty words from the lighter side of IT |

## Privacy

This application does not store any user data. There is no user database, no authentication tracking, and no analytics. The only client-side storage is a `localStorage` key to avoid repeating the last 25 words shown.

## License

MIT
