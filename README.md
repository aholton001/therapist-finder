# Therapist Finder

Find the right therapist by describing yourself in plain language. Therapist Finder scrapes Psychology Today listings, embeds therapist bios using AI, and matches them semantically to your self-description — no ads, no referral fees.

## How it works

1. **Scrape** — A Python/Playwright scraper collects therapist profiles from Psychology Today (name, bio, specialties, issues, therapy types, insurance, location)
2. **Embed** — Each therapist's bio and specialties are embedded using OpenAI `text-embedding-3-small` and stored in PostgreSQL with pgvector
3. **Match** — When you search, Claude rewrites your description into clinical language, embeds it, and runs a cosine similarity search against the therapist database
4. **Results** — Therapists are ranked by match percentage and link out to their full Psychology Today profiles

## Tech stack

| Layer | Technology |
|---|---|
| Frontend + API | Next.js 16 (App Router, TypeScript, Tailwind CSS) |
| Scraper | Python + Playwright |
| Database | PostgreSQL 16 + pgvector (HNSW index) |
| ORM | Prisma 7 + `@prisma/adapter-pg` |
| Embeddings | OpenAI `text-embedding-3-small` |
| Query enhancement | Claude API (`claude-haiku-4-5`) |
| Local dev | Docker Compose |

## Project structure

```
therapist-finder/
├── docker-compose.yml
├── db/
│   └── init.sql                # Enables pgvector extension
├── web/                        # Next.js app
│   ├── prisma/
│   │   ├── schema.prisma       # Therapist + SearchLog models
│   │   └── migrations/         # SQL migrations (includes HNSW vector index)
│   └── src/
│       ├── app/
│       │   ├── page.tsx            # Landing page
│       │   ├── search/page.tsx     # Results page
│       │   └── api/search/route.ts # Search endpoint
│       ├── components/
│       │   ├── SearchForm.tsx          # Freeform / questionnaire toggle
│       │   ├── QuestionnaireForm.tsx   # 5-step intake flow
│       │   └── TherapistCard.tsx       # Result card with match %
│       └── lib/
│           ├── db.ts           # Prisma client
│           ├── embeddings.ts   # OpenAI embedding calls
│           ├── claude.ts       # Query enhancement
│           ├── search.ts       # Vector similarity SQL
│           └── types.ts        # Shared types + questionnaire → query
└── scraper/                    # Python scraper
    ├── crawler/
    │   ├── browser.py          # Playwright context (stealth settings)
    │   ├── listing_crawler.py  # Paginate city listing pages
    │   └── profile_crawler.py  # Scrape individual profiles
    ├── pipeline/
    │   └── embedder.py         # Batch embed + upsert to Postgres
    ├── models/therapist.py     # Pydantic model + embedding text builder
    ├── config.py               # Settings from env vars
    └── main.py                 # Entrypoint
```

## Getting started

### Prerequisites

- Docker + Docker Compose
- Node.js 20+
- Python 3.12+
- OpenAI API key
- Anthropic API key

### 1. Environment setup

```bash
cp .env.example .env
# Fill in OPENAI_API_KEY and ANTHROPIC_API_KEY
```

Also copy the web env:
```bash
cp web/.env.example web/.env  # or edit web/.env directly
```

### 2. Start the database

```bash
docker compose up postgres -d
```

### 3. Run migrations

```bash
cd web
npx prisma migrate deploy
```

This creates the `Therapist` and `SearchLog` tables and adds the HNSW vector index.

### 4. Start the web app

```bash
cd web
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 5. Run the scraper

Install Python dependencies and Playwright:

```bash
cd scraper
pip install -r requirements.txt
playwright install chromium
```

Scrape a single city first to verify everything works:

```bash
python main.py --state new-york --city new-york-city --max-pages 3
```

Or run via Docker:

```bash
docker compose --profile scraper run scraper --state new-york --city new-york-city
```

Once scraped, therapists are immediately searchable. Start with one city, verify quality, then expand.

### Scraping more cities

```bash
# Run without --state/--city to scrape all default cities (top 10 US metros)
python main.py --max-pages 10
```

The default city list is in `scraper/main.py`. Add any city using its Psychology Today URL slug, e.g. `--state texas --city austin`.

## Search modes

**Describe yourself** — Write freely about what you're going through. Claude translates your description into clinical language before embedding, bridging the gap between how patients talk and how therapists write their bios.

**Answer questions** — A 5-step questionnaire covering presenting issues, therapy experience, preferred modalities, session format (in-person/telehealth), and insurance. Your answers are assembled into a query and matched the same way.

Both modes show results ranked by cosine similarity with a match percentage.

## Notes on scraping

- Psychology Today's ToS prohibits automated scraping. This project is intended for personal/research use.
- The scraper runs at ~1 request per 2–3 seconds and uses realistic browser headers to minimize disruption.
- Therapist profiles link out to Psychology Today — no bio content is reproduced in the UI.
- Re-scrape individual cities periodically (every 30 days) to keep data fresh.

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `OPENAI_API_KEY` | Yes | For generating embeddings |
| `ANTHROPIC_API_KEY` | Yes | For Claude query enhancement |
