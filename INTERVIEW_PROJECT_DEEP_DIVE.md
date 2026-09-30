# 🎨 Raati AI — Interview Deep Dive

> **One-liner:** A multi-agent AI system that evaluates design creativity using the Consensual Assessment Technique (CAT) framework — built as a Master's thesis at the University of Oulu.

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Design Architecture](#2-design-architecture)
3. [Tech Stack & Rationale](#3-tech-stack--rationale)
4. [Key Design Decisions & Why](#4-key-design-decisions--why)
5. [The Evaluation Pipeline in Detail](#5-the-evaluation-pipeline-in-detail)
6. [Data Architecture & Storage Strategy](#6-data-architecture--storage-strategy)
7. [Statistical Methods & Why They Matter](#7-statistical-methods--why-they-matter)
8. [Frontend Architecture](#8-frontend-architecture)
9. [Deployment & Infrastructure](#9-deployment--infrastructure)
10. [Evolution: v1 → v2 Architecture](#10-evolution-v1--v2-architecture)
11. [Validation Experiments](#11-validation-experiments)
12. [Anticipated Interview Follow-Up Questions](#12-anticipated-interview-follow-up-questions)
13. [Know These Without Notes — Technical Deep Dive](#13-know-these-without-notes--technical-deep-dive)
14. [How to Prepare for Any Surprise Question](#14-how-to-prepare-for-any-surprise-question)

---

## 1. System Overview

### What Problem Does This Solve?

Evaluating creative and technical design work (e.g., product sketches, concept designs) is **inherently subjective, time-consuming, and resource-intensive**. In academic settings, it requires panels of human domain experts who must independently score work across multiple creativity dimensions and then reach consensus. This is the **Consensual Assessment Technique (CAT)** — developed by Teresa Amabile, and considered the gold standard for creativity assessment.

**Raati AI asks:** *Can a multi-agent LLM panel produce reliable, agreement-consistent creativity assessments comparable to human expert panels?*

### What Does the System Do?

1. A student uploads a **design sketch (image) + text description**.
2. A **Recruiter Agent** (Claude Sonnet) analyzes the assignment and dynamically generates **3 domain-specific expert personas**.
3. Each persona is evaluated by **3 different LLM providers** (OpenAI GPT-4o, Anthropic Claude, xAI Grok) — producing **9 independent evaluations** in a **3×3 matrix**.
4. All 9 evaluations are **synthesized** into a consensus report with **deterministic score aggregation** and **inter-rater reliability statistics** (ICC, Kendall's W, ANOVA).
5. A **narrative composer** generates actionable, student-facing feedback.
6. An **evidence review** system detects factual conflicts and unsupported claims across the 9 judgments.

```
                          ┌─────────────────────────────────────┐
                          │       Student Submission             │
                          │   (Image + Description + Context)    │
                          └──────────────┬──────────────────────┘
                                         │
                                         ▼
                          ┌──────────────────────────────┐
                          │  Stage 1: Recruiter Agent     │
                          │  (Claude Sonnet 4.6)          │
                          │                               │
                          │  • Parses assignment verbs    │
                          │  • Classifies domain          │
                          │  • Generates 3 personas       │
                          └───────┬──────┬──────┬────────┘
                                  │      │      │
                      Persona A   │  Persona B  │  Persona C
                          │       │      │      │      │
               ┌──────────┼──────┼──────┼──────┼──────┼──────────┐
               │    ┌─────▼──┐ ┌─▼────┐ ┌▼─────┐              │
               │    │ OpenAI │ │OpenAI│ │OpenAI│              │
               │    │ GPT-4o │ │GPT-4o│ │GPT-4o│              │
               │    └────────┘ └──────┘ └──────┘              │
Stage 2:       │    ┌────────┐ ┌──────┐ ┌──────┐              │
3×3 Fan-Out    │    │  xAI   │ │ xAI  │ │ xAI  │  9 Async    │
(9 evals)      │    │Grok 4.1│ │Grok  │ │Grok  │  API Calls  │
               │    └────────┘ └──────┘ └──────┘              │
               │    ┌────────┐ ┌──────┐ ┌──────┐              │
               │    │ Claude │ │Claude│ │Claude│              │
               │    │Sonnet  │ │Sonnet│ │Sonnet│              │
               │    └────────┘ └──────┘ └──────┘              │
               └──────────────────┬───────────────────────────┘
                                  │
                     ┌────────────┼────────────────┐
                     │            │                │
                     ▼            ▼                ▼
          ┌──────────────┐ ┌───────────┐ ┌─────────────────┐
          │ Stage 3:     │ │ Stage 4:  │ │ Stage 5:        │
          │ Score        │ │ Evidence  │ │ Narrative       │
          │ Aggregator   │ │ Review    │ │ Composer        │
          │ (Python math)│ │ (Regex +  │ │ (Claude Sonnet) │
          │ Deterministic│ │ Heuristic)│ │ Student-facing  │
          └──────┬───────┘ └─────┬─────┘ └────────┬────────┘
                 │               │                │
                 └───────────────┼────────────────┘
                                 ▼
                    ┌─────────────────────────┐
                    │   Stage 6: Synthesizer  │
                    │   (Claude Sonnet)       │
                    │                          │
                    │ • ICC / Kendall's W      │
                    │ • Variance Analysis      │
                    │ • Final Report           │
                    └─────────────────────────┘
```

---

## 2. Design Architecture

### 2.1 High-Level Architecture Pattern

The system follows a **pipeline-oriented, multi-agent architecture** with clear stage boundaries:

| Stage | Component | Responsibility | Runs On |
|-------|-----------|---------------|---------|
| 1 | **Recruiter Agent** | Domain analysis + persona generation | Claude Sonnet 4.6 |
| 2 | **3×3 Fan-Out Evaluator** | 9 independent evaluations (3 personas × 3 LLMs) | GPT-4o, Grok 4.1, Claude Sonnet |
| 3 | **Score Aggregator** | Deterministic arithmetic (means, variance, medians) | Server-side Python (`Fraction`/`Decimal`) |
| 4 | **Evidence Review** | Contradiction detection + unsupported claim flagging | Server-side Python (regex + heuristics) |
| 5 | **Report Composer** | Student-facing narrative (180–320 words) | Claude Sonnet 4.6 |
| 6 | **Synthesizer** | Statistical analysis (ICC, Kendall's W) + LLM interpretation | Python (`pingouin`) + Claude |

### 2.2 Backend Architecture

```
backend/
├── main.py                          # FastAPI app (v1 + v2 endpoints)
├── database.py                      # Async SQLite with aiosqlite (v2)
└── services/
    ├── creativity_judge.py          # v1 pipeline orchestrator
    ├── evaluation_runner.py         # v2 pipeline orchestrator (bounded retries)
    ├── agents.py                    # Recruiter agent (persona generation)
    ├── evaluators.py                # v1 multi-LLM evaluators (direct API)
    ├── provider_adapters.py         # v2 unified adapter pattern (Strategy Pattern)
    ├── judgment_validator.py        # Strict Pydantic v2 schema validation
    ├── design_recruiter.py          # Source-grounded panel recruitment
    ├── professional_profiles.py     # Pre-approved evaluator profiles
    ├── synthesizer.py               # Score synthesis + ICC/ANOVA/Kendall's W
    ├── score_aggregator.py          # Deterministic Fraction-based arithmetic
    ├── evidence_review.py           # Contradiction + unsupported claim detection
    ├── report_composer.py           # Narrative generation with validation
    ├── report_service.py            # Report retrieval + CSV export
    ├── storage.py                   # CSV/JSON storage (v1) + image persistence
    └── persona_storage.py           # Persona library CRUD
```

### 2.3 Key Architectural Principles

1. **LLMs must NEVER compute scores** — All arithmetic is handled server-side in Python using exact-precision `Fraction` and `Decimal` types. This eliminates floating-point hallucination risk.

2. **Provider independence** — Every evaluation fires across all 3 LLMs to avoid single-model bias. The system treats LLM diversity as a *feature*, not an incidental choice.

3. **Strict schema validation** — Evaluator responses are validated against `EvaluatorJudgment` Pydantic models with `StrictInt` types — no coercion from `"4"`, `True`, `4.5`, or `null`.

4. **Immutable reports** — Once an evaluation is complete, the scorecard is frozen. The narrative layer can reference but never alter scores.

5. **Deterministic fallbacks** — If LLM composition fails, the system produces a deterministic template-based fallback narrative rather than crashing.

---

## 3. Tech Stack & Rationale

### 3.1 Backend

| Technology | Why This? | Why Not Alternatives? |
|------------|-----------|----------------------|
| **Python 3.10+** | First-class async/await, rich ML/data science ecosystem, native LLM SDK support | Node.js lacks mature data science libraries; Go/Rust add unnecessary complexity for a research prototype |
| **FastAPI** | Async-native, automatic OpenAPI docs, Pydantic integration for request/response validation | Django is synchronous by default and heavyweight; Flask lacks built-in async and validation |
| **Uvicorn (ASGI)** | Production-grade async server, hot-reload for development | Gunicorn is WSGI (sync); uvicorn handles concurrent LLM API calls efficiently |
| **Pydantic v2** | Runtime type validation, JSON schema generation, strict mode prevents LLM output coercion | Dataclasses lack validation; marshmallow is slower and more verbose |
| **asyncio.gather** | Fires 9 API calls concurrently with semaphore-bounded concurrency (max 3) | Threading adds GIL overhead; multiprocessing is overkill for I/O-bound API calls |
| **aiosqlite** | Async SQLite for v2 database (WAL mode for concurrent reads) | PostgreSQL adds deployment complexity for a research prototype; SQLite is sufficient for single-instance deployment |
| **pandas + pingouin** | ICC(2) and ANOVA computation — `pingouin` is the standard Python library for intraclass correlation | statsmodels has ICC but pingouin's API is cleaner and more specialized for inter-rater reliability |
| **Pillow** | Image optimization (RGBA to RGB, thumbnail to 1024px) before sending to LLM APIs | Sharp (Node.js only); Pillow is the Python standard for image processing |

### 3.2 LLM Providers

| Provider | Model | Role | Why This Model? |
|----------|-------|------|----------------|
| **OpenAI** | GPT-4o | Evaluator + v1 Synthesizer | Best-in-class multimodal vision; native JSON mode (`response_format: json_object`) |
| **Anthropic** | Claude Sonnet 4.6 | Recruiter + Evaluator + v2 Synthesizer + Composer | Strong structured reasoning; Files API for large images; cost-efficient for synthesis |
| **xAI** | Grok 4.1 Fast Reasoning | Evaluator | OpenAI-compatible API; adds model diversity; competitive vision capabilities |

**Why 3 providers instead of just 1?**
Using a single LLM (e.g., only GPT-4o) would create a mono-model bias — the 9 "independent" evaluations would share the same training data, safety filters, and scoring tendencies. By crossing 3 personas x 3 providers, we get genuine **inter-model variance**, which is what makes the ICC statistics meaningful. This mirrors how human CAT panels use judges from different institutions.

### 3.3 Frontend

| Technology | Why This? | Why Not Alternatives? |
|------------|-----------|----------------------|
| **React 19** | Component model ideal for complex interactive dashboards; hooks for state management | Vue/Svelte have smaller ecosystems; React's maturity makes it safer for a thesis project |
| **TypeScript** | Type safety catches integration bugs early (API response shapes, score types) | Plain JS would miss type mismatches between frontend and backend data contracts |
| **Vite 7** | Sub-second HMR, native ESM, zero-config TypeScript support | CRA is deprecated; Webpack is slow; Vite is the modern standard |
| **TailwindCSS 4** | Rapid UI development, consistent design system, dark mode via `class` strategy | Custom CSS is slower to iterate; Bootstrap's opinions conflict with custom design |
| **Recharts** | React-native charting library for radar charts and trend lines | Chart.js requires imperative API; D3 is too low-level for this use case |
| **Framer Motion** | Declarative animation library; stagger animations for the panel reveal | CSS animations are harder to orchestrate; GSAP requires more boilerplate |
| **jsPDF** | Client-side PDF generation from evaluation data (data-driven, not screenshot-based) | Server-side PDF adds API latency; html2canvas loses fidelity on complex layouts |
| **Axios** | Robust HTTP client with interceptors, timeout config, and FormData support | Fetch API lacks interceptors and automatic JSON parsing |

### 3.4 Deployment

| Technology | Why? |
|------------|------|
| **Render** | Free tier for static sites + web services; persistent disk for data storage; automatic deploys from Git |
| **render.yaml** | Infrastructure-as-code: both frontend (static site) and backend (Python web service) defined declaratively |

---

## 4. Key Design Decisions & Why

### 4.1 The 3x3 Fan-Out Matrix

**Decision:** Every evaluation produces 9 independent judgments (3 personas x 3 LLMs).

**Why:** This is not arbitrary — it's a deliberate research design choice:
- **Persona axis** provides *domain-perspective variance* (a creativity expert sees different things than a materials expert).
- **Provider axis** provides *model-level variance* (GPT-4o and Claude have different training data and safety filters).
- **9 data points** is the minimum needed to compute ICC(2) with 6 dimensions and 3+ raters, which is the academic standard for inter-rater reliability.

**Trade-off:** 9 API calls cost ~$0.15-0.50 per evaluation and take 15-45 seconds. We accept this for research validity.

### 4.2 LLMs Must Never Compute Scores (Slice 1)

**Decision:** All score arithmetic is performed server-side using Python's `Fraction` and `Decimal` types.

**Why:**
- LLMs are unreliable at arithmetic — they can hallucinate means, round incorrectly, or produce floating-point errors.
- By making the score aggregator deterministic and server-owned, we get reproducible results.
- `Fraction(39, 9)` produces exact rational arithmetic; `Decimal` with `ROUND_HALF_UP` ensures consistent display rounding.

**The separation is enforced architecturally:**
- The synthesis prompt explicitly says "Do NOT include any score fields in your response"
- The LLM only returns reasoning text
- Score fields returned by the LLM are overwritten/rejected

### 4.3 Dynamic Persona Generation vs. Static Experts

**Decision (v1):** The Recruiter Agent dynamically generates personas based on the assignment text.

**Why:** Different assignments need different expertise. A product sketch needs different judges than an architectural rendering or an ideation exercise. Dynamic generation ensures the panel matches the task.

**Evolution (v2):** Source-grounded profiles. Instead of letting the LLM invent any expert, v2 uses pre-approved `ProfessionalProfile` records derived from real uploaded biographies. This prevents the LLM from fabricating credentials.

### 4.4 Assignment-Scope Calibration

**Decision:** The rubric includes a mandatory "Step 0" that forces evaluators to calibrate their expectations to the assignment scope.

**Why:** Without this, LLM judges tend to evaluate against an idealized professional portfolio standard rather than the actual assignment requirements. A concept sketch should not be penalized for lacking manufacturing tolerances.

### 4.5 Evidence Review System

**Decision:** A rule-based (not LLM) system scans all 9 judgments for contradictions and unsupported claims.

**Why:**
- **Contradictions**: If 3 judges say "armrest is present" and 2 say "armrest is absent," that's a factual disagreement that should be flagged, not averaged away.
- **Unsupported claims**: If a judge states "the chair will cause discomfort after 30 minutes," that's an empirical claim that cannot be established from an image alone.
- Using regex patterns instead of an LLM for this step ensures deterministic, fast, and explainable flagging.

### 4.6 Provider Adapter Pattern (Strategy Pattern)

**Decision:** Each LLM provider is wrapped in a `BaseProviderAdapter` subclass with a unified `call_evaluator()` interface.

**Why:**
- Different providers have different APIs (OpenAI uses chat completions; Claude uses messages with a separate system field; xAI is OpenAI-compatible but with different model names).
- The adapter normalizes all responses into a `ProviderResponse` envelope with standardized fields: `status`, `parsed_json`, `model_id`, `finish_reason`, `usage`, `elapsed_ms`, `error`.
- Adding a new provider (e.g., Google Gemini) requires only implementing one new adapter class.

### 4.7 Bounded Retry Strategy

**Decision:** Each evaluation slot gets at most 2 attempts (1 initial + 1 retry). No infinite retry loops.

**Why:**
- LLM API failures are common (rate limits, timeouts, malformed JSON).
- Infinite retries could run up costs and delay results indefinitely.
- 2 attempts is enough to recover from transient failures; persistent failures are recorded and the panel proceeds with partial data.

### 4.8 Dual Storage: CSV + JSON (v1) and SQLite (v2)

**Decision:** v1 uses CSV for fast history listing + individual JSON files for full results. v2 adds SQLite for structured querying.

**Why:**
- **CSV**: Ultra-fast to scan for a history listing page; no database driver needed; easy to backup.
- **JSON per evaluation**: Full result fidelity (9 expert panels + stats); easy to inspect and debug.
- **SQLite (v2)**: As the schema grew (assignment versions, attempts, judgments, aggregates, reviews), relational storage became necessary. SQLite with WAL mode supports concurrent reads without a database server.

---

## 5. The Evaluation Pipeline in Detail

### v1 Pipeline (`creativity_judge.py`)

```
evaluate_design()
  |
  +-- 1. Read & optimize image (Pillow: RGBA->RGB, resize to 1024px)
  +-- 2. Recruiter Agent (Claude Sonnet -> 3 personas)
  +-- 3. Fan-Out (asyncio.gather -> 9 evaluations, semaphore=3)
  +-- 4. Synthesize (Claude Sonnet -> reasoning text + ICC/ANOVA)
  +-- 5. Score Aggregator (Python Fraction math -> scorecard)
```

### v2 Pipeline (`evaluation_runner.py`)

```
run_evaluation_pipeline()
  |
  +-- 1. Resolve contract + panel (pre-frozen, source-grounded)
  +-- 2. Dispatch 9 slots (3 personas x 3 providers)
  |     +-- Per-slot: build system prompt -> call provider adapter
  |     +-- Validate response (EvaluatorJudgment strict schema)
  |     +-- Bounded retry (max 2 attempts per slot)
  |     +-- Persist accepted judgment to SQLite
  +-- 3. Score Aggregation (Fraction/Decimal, 54 raw scores -> scorecard)
  +-- 4. Evidence Review (contradiction + unsupported claim detection)
  +-- 5. Narrative Composition (Claude -> validated 180-320 word report)
  +-- 6. Persist report + update run status
```

### Key Differences v1 vs v2

| Aspect | v1 | v2 |
|--------|----|----|
| Persona source | LLM-generated on the fly | Source-grounded professional profiles |
| Score computation | LLM synthesis included scores | LLM explicitly excluded from scores |
| Storage | CSV + JSON files | SQLite with 9 normalized tables |
| Validation | Basic JSON parse | Strict Pydantic v2 with `StrictInt` |
| Error handling | Try/catch with fallback | Bounded retries + per-attempt tracking |
| Report | LLM synthesis text | Evidence-reviewed narrative with word ceiling |

---

## 6. Data Architecture & Storage Strategy

### v1 Storage Model

```
data/
+-- results.csv          # Lightweight index (id, timestamp, score, description)
+-- evaluations/         # Full JSON per evaluation
|   +-- {uuid}.json      # Contains expert_panel[], stats{}, domain_analysis{}
+-- images/              # Uploaded design sketches
    +-- {uuid}.png
```

### v2 Database Schema (SQLite)

```
assignment_versions           -> Immutable assignment contracts with versioning
professional_profile_versions -> Source-grounded evaluator profiles
panel_versions                -> Frozen 3-slot panel specifications
submission_versions           -> Student submissions with assets
evaluation_runs               -> Top-level orchestration (status, completeness)
evaluation_attempts           -> One row per API call (status, validation, usage)
accepted_judgments            -> One per slot per run (denormalized scores)
aggregate_versions            -> Deterministic scorecard snapshots
evidence_reviews              -> Flagged contradictions and unsupported claims
report_versions               -> Narrative text + disposition + v1 compat fields
```

**Why this normalization?**
- **Audit trail**: Every API call is tracked with its validation outcome, elapsed time, and usage tokens.
- **Idempotency**: `UNIQUE(run_id, slot_id)` on accepted_judgments prevents double-counting.
- **Versioning**: Assignment contracts and panels are versioned — changing the rubric creates a new version, not an in-place mutation.

---

## 7. Statistical Methods & Why They Matter

### ICC — Intraclass Correlation Coefficient

**What:** ICC(2) measures how much of the total score variance is due to genuine differences between the thing being rated (dimensions) versus differences between the raters (judges).

**Why ICC and not Cronbach's alpha?** Cronbach's alpha measures internal consistency (do items on the same test correlate?). ICC measures inter-rater agreement (do different judges give similar scores to the same item?). We need the latter.

**Why ICC(2) specifically?** ICC(2) is the "two-way random, absolute agreement" model — it treats both raters and items as random effects, and it penalizes systematic bias (if one judge always scores higher). This is the correct model for a panel where judges are sampled from a population.

| ICC Value | Interpretation |
|-----------|---------------|
| >= 0.75 | Excellent agreement |
| 0.60 - 0.74 | Good agreement |
| 0.40 - 0.59 | Moderate agreement |
| < 0.40 | Poor agreement |

### Kendall's W — Coefficient of Concordance

**What:** Measures the overall concordance (agreement) of all 9 raters ranking the 6 dimensions. W = 1 means perfect agreement; W = 0 means no agreement.

**Why add this alongside ICC?** ICC measures absolute agreement (do they give similar *values*?). Kendall's W measures ordinal agreement (do they *rank* dimensions the same way?). A panel might have moderate ICC (different absolute levels) but high W (they agree on which dimensions are stronger/weaker).

### Variance Analysis

**What:** Computes per-dimension variance across all 9 evaluators to identify which creativity dimension has the most disagreement.

**Why:** If all judges agree on "Clarity" but disagree wildly on "Originality," that tells us something about the construct — originality is inherently more subjective and harder to assess consistently.

---

## 8. Frontend Architecture

### Page Structure

| Page | Purpose | Key Components |
|------|---------|---------------|
| **Landing** | Marketing/intro page explaining the system | Animated hero, feature cards, flow diagram |
| **How It Works** | Detailed explanation of the evaluation pipeline | Step-by-step animated walkthrough |
| **Dashboard** | Main upload interface | Drag-and-drop image upload, description input, recruiter mode selection |
| **Evaluate** | Advanced evaluation with persona library | Saved persona selection, custom persona upload (PDF/text) |
| **Results** | Full evaluation report for a single submission | Radar chart, 3x3 accordion grid, ICC stats, PDF export |
| **History** | All past submissions | Filterable/sortable table with score badges |
| **Persona Library** | CRUD for saved personas | Generate from profiles, delete, select for evaluation |

### State Management

- **No external state library** (no Redux/Zustand). Each page manages its own state via React hooks (`useState`, `useEffect`).
- **Why:** The app is page-centric with minimal cross-page state. URL params (`/results/:id`) handle the main state transfer. Adding Redux would be over-engineering for this use case.

### API Communication

```typescript
// config.ts
export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
```

- **Axios** for HTTP requests with automatic JSON parsing.
- **FormData** for multipart file uploads (image + description + recruiter mode).

---

## 9. Deployment & Infrastructure

### Render Deployment (`render.yaml`)

```yaml
services:
  - type: web              # Backend: FastAPI
    runtime: python
    startCommand: uvicorn main:app --host 0.0.0.0 --port $PORT
    disk:
      name: raati-data
      mountPath: /opt/render/project/src/data
      sizeGB: 1             # Persistent disk for images + results

  - type: web              # Frontend: Static Site
    runtime: static
    buildCommand: npm install && npm run build
    staticPublishPath: dist
    routes:
      - type: rewrite
        source: /*
        destination: /index.html  # SPA client-side routing
```

**Why Render?**
- Free tier sufficient for a thesis prototype.
- Persistent disk for data storage (no external database service needed).
- Static site hosting with SPA rewrite rules.
- Infrastructure-as-code via `render.yaml`.

**Why not Vercel/Netlify?** Those are frontend-focused. Render supports both static sites and Python backend services with persistent disk, which is essential for file-based storage.

---

## 10. Evolution: v1 to v2 Architecture

The system evolved through 6 "Slices" — each adding a specific capability:

| Slice | Feature | What Changed |
|-------|---------|-------------|
| **Slice 1** | Server-owned scores | LLM stripped of all score fields; `score_aggregator.py` added with `Fraction`/`Decimal` math |
| **Slice 2** | Assignment contracts | `AssignmentContract` Pydantic model; brief deduplication detection; rubric versioning |
| **Slice 3** | Source-grounded profiles | `professional_profiles.py` with `ExpertiseClaim` audit trail; `design_recruiter.py` with `PanelSpec` |
| **Slice 4** | Provider adapters + strict validation | `provider_adapters.py` (Strategy Pattern); `judgment_validator.py` with `StrictInt` |
| **Slice 5** | Evidence review + narrative | `evidence_review.py` (contradiction/claim detection); `report_composer.py` (word-bounded narrative) |
| **Slice 6** | Full pipeline + database | `evaluation_runner.py` (bounded retries); `database.py` (9 SQLite tables); async background tasks |

### Why This Incremental Approach?

This is a research project. Each slice was validated before building the next. Slice 1 was critical — it proved that removing LLM arithmetic didn't degrade quality. Slice 3 was the biggest research insight — dynamically generated personas were unreliable (they invented credentials), so source-grounding was essential.

---

## 11. Validation Experiments

### Persona Independence Experiment

**Goal:** Verify that the 3 personas produce genuinely independent evaluations (not just paraphrasing each other).

**Method:** Run the same submission through multiple panels and measure per-persona ICC. If ICC across personas is low but ICC within each persona (across providers) is high, personas are independent but internally consistent.

### Academic vs. Industry Crossover Experiment

**Goal:** Test whether swapping academic-style personas for industry-style personas changes evaluation outcomes.

**Method:** Evaluate the same submission with both panel types and compare score distributions across the 6 dimensions.

### 46-Chair CAT Experiment

**Goal:** Evaluate 46 chair designs (a standard dataset) using the full pipeline to produce publication-ready ICC statistics comparable to the original human-panel results.

---

## 12. Anticipated Interview Follow-Up Questions

### Architecture & Design

**Q: Why not use a single LLM call with a longer prompt instead of 9 separate calls?**

A single call would make all 9 "evaluations" correlated — they'd share the same context window, attention patterns, and generation temperature. The whole point of the 3x3 matrix is statistical independence. This mirrors real CAT panels where judges evaluate in isolation.

**Q: Why not use function calling / tool use instead of JSON mode?**

JSON mode was chosen for portability — it works the same way across OpenAI, xAI (via OpenAI-compatible API), and Claude. Function calling has provider-specific schemas. Since we're already validating with Pydantic, JSON mode + strict validation achieves the same result without provider lock-in.

**Q: Why SQLite instead of PostgreSQL?**

SQLite is the right fit for a single-instance research prototype:
- Zero configuration, zero network latency, no separate process.
- WAL mode supports concurrent async reads.
- The data volume (hundreds of evaluations, not millions) doesn't need PostgreSQL's query planner or connection pooling.
- If this needed to scale to multi-instance, I'd migrate to PostgreSQL — the `aiosqlite` interface maps cleanly to `asyncpg`.

**Q: Why not use LangChain or LlamaIndex for the agent orchestration?**

LangChain adds abstraction overhead without proportional value here. The pipeline is a fixed sequence (Recruiter -> Fan-Out -> Aggregate -> Review -> Compose), not a dynamic agent loop. Raw SDK calls are simpler, debuggable, and have no dependency risk from LangChain's rapid breaking changes. I don't need RAG, vector stores, or chain composition — just structured API calls with retry logic.

**Q: Why async (`asyncio.gather`) instead of Celery or background workers?**

The 9 API calls are I/O-bound (network latency), not CPU-bound. `asyncio.gather` with a semaphore is the lightest-weight solution for concurrent I/O. Celery would require Redis/RabbitMQ, adding infrastructure complexity. For the v2 async path, FastAPI's `BackgroundTasks` handles deferred execution without a task queue.

### Tech Stack

**Q: Why FastAPI over Django REST Framework?**

1. **Async-native**: FastAPI runs on ASGI, handling concurrent LLM calls without thread pools. Django REST is WSGI-based.
2. **Pydantic integration**: Request/response models are validated automatically. DRF's serializers are more verbose.
3. **Performance**: FastAPI is one of the fastest Python frameworks (based on Starlette + Uvicorn).
4. **Simplicity**: This is an API backend, not a content management system. Django's ORM, admin panel, and middleware pipeline are unnecessary here.

**Q: Why React instead of Vue or Svelte?**

1. **Ecosystem size**: Recharts, Framer Motion, jsPDF, react-router-dom — the React ecosystem has the most mature libraries for this use case.
2. **TypeScript support**: React + TypeScript is the most battle-tested combination.
3. **Hiring familiarity**: Most reviewers and contributors will know React.
4. That said, Vue or Svelte would work fine — this is a pragmatic choice, not a principled objection to alternatives.

**Q: Why not Next.js instead of Vite?**

Next.js is a full-stack React framework with SSR, file-based routing, and API routes. This project:
- Has a **separate Python backend** — Next.js API routes would duplicate that.
- Doesn't need SSR — it's an authenticated dashboard, not a public SEO-critical site.
- Vite provides faster dev server and simpler configuration for a pure SPA.

**Q: Why Anthropic Claude for the Recruiter and Synthesizer instead of OpenAI?**

1. Claude Sonnet's structured reasoning is strong for persona generation (parsing assignment verbs, generating multi-field JSON).
2. Cost: Claude Sonnet is cheaper than GPT-4o for text-only synthesis.
3. Model diversity: Using OpenAI for evaluation *and* synthesis would create a dependency; separating concerns across providers reduces single-point-of-failure risk.

### Statistics & Research

**Q: What if all 9 judges agree perfectly? Doesn't that mean the scores are correct?**

High ICC means high *agreement*, not high *accuracy*. If all 9 LLM judges share the same bias (e.g., always score "Originality" lower than humans do), they'll agree perfectly but still be wrong. That's why the thesis compares AI panel ICC against human panel ICC from the same dataset.

**Q: How do you handle cases where an LLM returns a score outside the 1-5 range?**

The `judgment_validator.py` uses `StrictInt` with `ge=1, le=5`. Any score outside the range, or non-integer (like `"4"`, `4.5`, `True`, `null`), is **rejected**, not coerced. The slot gets a second attempt; if both fail, it's marked as a failed slot and the panel proceeds with partial data.

**Q: What happens if fewer than 9 judgments succeed?**

The completeness field is set to "partial". Score aggregation requires exactly 9 valid slots (by design — `aggregate_complete_panel` raises `ValueError` on fewer). With partial data, the system falls back to per-available scores and marks the report disposition as "blocked" or "needs_review."

### Production Readiness

**Q: What would you change for a production deployment?**

1. **Database**: Migrate from SQLite to PostgreSQL for multi-instance support.
2. **Task queue**: Add Celery + Redis for async evaluation (currently uses FastAPI BackgroundTasks, which doesn't survive process restarts).
3. **Authentication**: Replace the simulated Haka login with actual SAML/OpenID Connect integration.
4. **Rate limiting**: Add per-user API rate limiting to prevent cost overruns.
5. **Monitoring**: Add structured logging (e.g., Datadog/Sentry), latency dashboards, and cost tracking per evaluation.
6. **Caching**: Cache persona generation results for the same assignment text.
7. **Cost controls**: Set per-user daily spending limits on LLM API calls.

---

## 13. Know These Without Notes — Technical Deep Dive

These are questions you should be able to answer **fluently from memory** — they trace real code paths and demonstrate you built the system, not just described it.

---

### 13.1 What happens from a user action in React to the FastAPI response?

**The complete request lifecycle:**

```
React (Evaluate.tsx)           Network              FastAPI (main.py)              Services
─────────────────────          ───────              ──────────────────             ────────
1. User fills form:
   - Drags image onto drop zone
   - Types description + name
   - Selects recruiter mode
   - Clicks "Analyze"
         │
2. handleSubmit() fires:
   - Builds FormData:
     formData.append('image', file)
     formData.append('description', desc)
     formData.append('submitter_name', name)
     formData.append('recruiter_mode', mode)
         │
3. axios.post(`${API_BASE_URL}/evaluate`,
     formData, { headers:
     {'Content-Type': 'multipart/form-data'}})
         │                    │
         │                    ├──── HTTP POST /evaluate ────►  @app.post("/evaluate")
         │                    │                                    │
         │                    │                                4. FastAPI parses multipart:
         │                    │                                   image: UploadFile
         │                    │                                   description: str (Form)
         │                    │                                   recruiter_mode: str (Form)
         │                    │                                    │
         │                    │                                5. evaluate_design() called (async):
         │                    │                                   a. Pillow: RGBA→RGB, resize to 1024px
         │                    │                                   b. base64 encode image
         │                    │                                   c. Recruiter Agent (Claude) → 3 personas
         │                    │                                   d. run_expert_panel() → 9 async evaluations
         │                    │                                   e. synthesize() → reasoning + ICC/ANOVA
         │                    │                                   f. score_aggregator → Fraction math → scorecard
         │                    │                                    │
         │                    │                                6. save_submission():
         │                    │                                   - Saves image to data/images/{uuid}.ext
         │                    │                                   - Writes full JSON to data/results/{uuid}.json
         │                    │                                   - Appends CSV row to data/results.csv
         │                    │                                   - Returns sanitized JSON record
         │                    │                                    │
         │                    ◄──── JSON response ─────────────────┘
         │                    │
7. navigate(`/results/${response.data.id}`,
     { state: { result: response.data } })
         │
8. Results.tsx mounts:
   - Reads result from router state
   - Renders radar chart (Recharts)
   - Renders 3×3 accordion panel grid
   - Renders ICC/Kendall's W stats
   - Enables PDF export (jsPDF)
```

**Key detail to mention:** The `evaluate_design()` call is `await`ed — the HTTP connection stays open for 15-45 seconds while 9 LLM calls complete. This is acceptable for a research tool but would need WebSocket or polling for production. The v2 endpoint (`/api/v2/evaluate`) addresses this with `BackgroundTasks` + 202 Accepted + polling via `/api/v2/evaluations/{run_id}`.

---

### 13.2 What are the principal API endpoints and data shapes?

**v1 Endpoints (main.py):**

| Method | Path | Input | Output |
|--------|------|-------|--------|
| `POST` | `/evaluate` | `FormData: image (UploadFile), description (str), submitter_name (str), recruiter_mode (str), persona_file? (UploadFile), persona_text? (str), selected_persona_ids? (str)` | Full evaluation record JSON |
| `GET` | `/results/{id}` | URL param: UUID | Full JSON result (expert_panel + scorecard + stats) |
| `GET` | `/history` | — | Array of `{id, timestamp, image_filename, description, overall_score, image_url, submitter_name}` |
| `GET` | `/analytics` | — | `{total_submissions, submissions_this_month, average_score, highest_score, distribution[]}` |
| `GET` | `/personas` | — | `{personas: [{persona_id, name, title, sub_text, prompt, source_reference, created_at}]}` |
| `POST` | `/personas/generate` | `FormData: persona_file? (UploadFile), persona_text (str), num_personas (int)` | `{saved: [...], count: int}` |
| `DELETE` | `/personas/{id}` | URL param: persona_id | `{success: true, persona_id}` |

**v2 Endpoints (Spec §11.3):**

| Method | Path | Input | Output |
|--------|------|-------|--------|
| `POST` | `/api/v2/assignments` | `AssignmentContract` JSON body | `{status, assignment}` |
| `GET` | `/api/v2/assignments/{id}` | URL param | Contract JSON |
| `GET` | `/api/v2/professional-profiles` | — | `{profiles: [ProfessionalProfile, ...]}` |
| `POST` | `/api/v2/assignments/{id}/panel` | URL param | `{status, panel: PanelSpec}` |
| `POST` | `/api/v2/evaluate` | `FormData: image, designer_description?, assignment_id, submitter_name, sync (bool)` | `202 {status: 'queued', run_id, status_url}` or full report if `sync=true` |
| `GET` | `/api/v2/evaluations/{run_id}` | URL param | Evaluation report with scorecard + narrative |
| `GET` | `/api/v2/evaluations/{run_id}/export` | `?format=json\|csv` | JSON report or CSV download |

**Core data shape — single evaluation result:**

```json
{
  "id": "uuid",
  "timestamp": "ISO-8601",
  "image_url": "/images/uuid.jpg",
  "description": "...",
  "creativity_score": 3.7,         // Server-computed from Fraction math
  "originality_score": 3.2,
  "usefulness_relevance_score": 4.0,
  "clarity_score": 3.8,
  "level_of_detail_elaboration_score": 3.4,
  "feasibility_score": 3.9,
  "overall_score": 3.67,
  "scorecard": { /* per-dim: mean, min, max, median, stdev, display */ },
  "expert_panel": [
    {
      "model_provider": "OpenAI",
      "persona": { "name": "...", "title": "...", "persona_id": "..." },
      "result": {
        "creativity_score": 4,
        "creativity_reasoning": "The cantilevered backrest...",
        // ... 6 dimensions × (score + reasoning)
        "instructor_feedback": "..."
      }
    }
    // ... 8 more entries (9 total)
  ],
  "stats": {
    "icc": { "ICC": 0.72, "F": 3.41, "pval": 0.002, ... },
    "kendall_w": 0.68,
    "anova": { ... },
    "per_dimension_variance": { "creativity": 0.44, ... }
  }
}
```

---

### 13.3 What did the nine evaluators receive and return?

**Each evaluator receives:**

1. **System prompt** (~2500 tokens) containing:
   - The persona definition (name, title, expertise areas, evaluation lens)
   - The fixed rubric (Step 0: scope calibration, Step 1: anti-conflation rules, scoring anchors 1-5, 6 dimension definitions, mandatory critique requirements)
   - Output format specification (JSON schema)

2. **User message** containing:
   - The design description (student-provided text)
   - The design image (base64-encoded inline for OpenAI/xAI, or via Claude Files API upload for Anthropic)

3. **API configuration:**
   - `temperature: 0.1` (low randomness for consistency)
   - `max_completion_tokens: 3000`
   - `response_format: { type: "json_object" }` (OpenAI/xAI) or equivalent structured prompting (Claude)

**Each evaluator returns** (v1 format):

```json
{
  "creativity_score": 4,
  "creativity_reasoning": "The curved tubular backrest creates an unexpected...",
  "originality_score": 3,
  "originality_reasoning": "While the overall form...",
  "usefulness_relevance_score": 4,
  "usefulness_relevance_reasoning": "...",
  "clarity_score": 3,
  "clarity_reasoning": "...",
  "level_of_detail_elaboration_score": 3,
  "level_of_detail_elaboration_reasoning": "...",
  "feasibility_score": 4,
  "feasibility_reasoning": "...",
  "instructor_feedback": "🎯 Diagnosis: ... ⚠️ Where to Pivot: ... 🛠️ Next Step: ..."
}
```

**v2 format** (`EvaluatorJudgment`) is richer:

```json
{
  "evidence": [
    { "evidence_id": "E1", "source_type": "image", "source_id": "img-0",
      "feature_or_requirement": "cantilever backrest",
      "statement": "The curved tubular backrest connects...",
      "observation_type": "visible" }
  ],
  "criteria": {
    "creativity": {
      "status": "scored", "score": 4,
      "evidence_ids": ["E1"], "evidence_strength": "adequate",
      "rationale": "...", "limitation": null
    }
    // ... 5 more dimensions
  },
  "suggestions": [
    { "dimension": "feasibility", "evidence_ids": ["E1"],
      "action": "Add a section view...", "intended_benefit": "..." }
  ]
}
```

The key difference: v2 requires **explicit evidence references** — every score must link back to a named evidence item. This enables the evidence review system to cross-check claims across the 9 judgments.

---

### 13.4 How did you run them concurrently with asyncio.gather()?

**The actual code pattern** (from `evaluators.py:427-454`):

```python
async def run_expert_panel(personas_list, description, base64_image, image_bytes):
    mime_type = _detect_mime_type(image_bytes)

    # Semaphore limits concurrent requests to avoid OOM on constrained servers
    sem = asyncio.Semaphore(3)

    async def _bound_evaluate(coro):
        async with sem:
            return await coro

    tasks = []
    for persona in personas_list:          # 3 personas
        tasks.append(_bound_evaluate(evaluate_with_openai(persona, description, base64_image, mime_type)))
        tasks.append(_bound_evaluate(evaluate_with_xai(persona, description, base64_image, mime_type)))
        tasks.append(_bound_evaluate(evaluate_with_claude(persona, description, image_bytes)))

    # 9 tasks, max 3 running at any moment
    results = await asyncio.gather(*tasks)
    return list(results)
```

**Why this works and what it actually does:**

1. `asyncio.gather(*tasks)` schedules all 9 coroutines onto the event loop. It returns a single awaitable that resolves when **all** 9 are done.
2. Without the semaphore, all 9 would fire simultaneously. The `Semaphore(3)` ensures at most 3 are waiting on network I/O at the same time — this prevents memory spikes from holding 9 large image payloads in flight on a 512MB Render instance.
3. Each `evaluate_with_*` function is itself an async coroutine that `await`s the provider's HTTP client. While one is waiting for OpenAI's response (I/O-bound), the event loop can run another coroutine's request to xAI.
4. `asyncio.gather` collects results in **input order**, not completion order — so `results[0]` is always the first task regardless of which provider responded first.

**The critical "why concurrency helps" answer:**

The application spends nearly all its time **waiting on independent external API calls** (each takes 3-15 seconds). Concurrent I/O overlaps that waiting — while coroutine A is blocked on OpenAI's network response, coroutine B can start its request to xAI. This is fundamentally different from CPU-bound parallelism. Python's `asyncio` does **not** make CPU-bound work 9× faster (there's still a single thread and the GIL). But for I/O-bound waiting, you get near-linear improvement: 9 sequential 5-second calls = 45 seconds; 9 concurrent calls (sem=3, 3 batches) ≈ 15 seconds.

Python's asyncio docs explicitly distinguish this: `gather()` schedules concurrent awaitables and returns results in order; if any raise an exception, it propagates (or with `return_exceptions=True`, exceptions appear in the results list). The v2 pipeline uses `return_exceptions=True` to gracefully handle partial failures.

---

### 13.5 What happened when one provider failed, returned malformed output, or timed out?

**Three layers of defense:**

**Layer 1 — Retry with exponential backoff** (v1: `evaluators.py:21-38`):
```python
MAX_RETRIES = 3
RETRY_BACKOFF = [1.0, 2.0, 4.0]  # seconds

async def _with_retry(coro_fn, *args, retries=MAX_RETRIES, backoff=RETRY_BACKOFF, label="API"):
    for attempt in range(retries):
        try:
            return await coro_fn(*args)
        except Exception as e:
            wait = backoff[attempt] if attempt < len(backoff) else backoff[-1]
            if attempt < retries - 1:
                await asyncio.sleep(wait)  # exponential backoff
            else:
                raise  # final failure
```

**Layer 2 — Truncated JSON repair** (v1: `evaluators.py:57-79`):
When an LLM hits its `max_tokens` limit, the JSON response gets cut mid-string. The `_try_repair_truncated_json()` function attempts progressive repair:
- Append `"}` to close an unterminated string + object
- Balance unmatched braces and brackets
- Try `json.loads()` on each candidate
- If all repairs fail, the slot returns an `error` dict instead of a `result` dict

**Layer 3 — Graceful degradation** (v1: each `evaluate_with_*` function):
Every evaluator function wraps its entire body in try/except. On failure, it returns `{"model_provider": "...", "persona": {...}, "error": "..."}` instead of `{"result": {...}}`. The synthesizer and score aggregator filter these out — they only process entries that have a `"result"` key.

**v2 adds stricter controls:**
- **Bounded retries**: Max 2 attempts per slot (not 3) — cost-conscious.
- **Per-attempt database tracking**: Every API call is recorded in `evaluation_attempts` with status, validation_outcome, elapsed_ms, and any validation_errors.
- **Strict schema validation**: `judgment_validator.py` runs Pydantic v2 `model_validate()` on the parsed JSON. If the response has `"score": "4"` (string instead of int), `True`, `4.5`, or a score of 6 — it's rejected as `validation_outcome='rejected'`, not silently coerced.
- **Completeness tracking**: The run's `completeness` field is set to `"complete"` (9/9), `"partial"` (1-8/9), or `"none"` (0/9). Score aggregation only runs on `"complete"` panels.

---

### 13.6 Where are results stored, and how does the UI display them?

**Storage (v1 — `storage.py`):**

| What | Where | Format |
|------|-------|--------|
| Uploaded images | `data/images/{uuid}.{ext}` | Original binary (PNG/JPG) |
| Full evaluation | `data/results/{uuid}.json` | JSON: expert_panel, scorecard, stats, reasoning, feedback |
| History index | `data/results.csv` | CSV: id, timestamp, image_filename, description, overall_score, submitter_name |

The CSV is the fast-scan index for the History page. The JSON is the full record for the Results page. This dual-write avoids loading all JSON files just to show a list.

**Storage (v2 — `database.py`):**

SQLite with 10 tables (see Section 6). Evaluation attempts, accepted judgments, aggregate scorecards, evidence reviews, and narrative reports all get their own rows with foreign keys to `evaluation_runs.run_id`.

**How the UI displays results (Results.tsx):**

1. **Router state passthrough**: When navigating from Evaluate → Results, the full JSON is passed via `navigate('/results/${id}', { state: { result: data } })`. If the user refreshes, Results.tsx falls back to `axios.get(`/results/${id}`)` to re-fetch.

2. **Radar chart**: Recharts `RadarChart` with 6 axes (one per dimension). The polygon shows the mean scores; individual evaluator dots can be toggled.

3. **3×3 Expert Panel accordion**: 9 expandable cards arranged in a grid. Each card shows:
   - Provider icon (OpenAI/xAI/Claude) + persona name + title
   - 6 dimension scores as colored badges
   - Expandable reasoning text per dimension
   - Instructor feedback (Diagnosis / Pivot / Next Step)

4. **Statistical panel**: ICC value with interpretation label, Kendall's W, per-dimension variance bars.

5. **PDF export**: `jsPDF` generates a data-driven PDF (not a screenshot) — iterates through scorecard data, dimension reasoning, and statistics to compose pages programmatically. This ensures crisp text rendering regardless of screen resolution.

---

### 13.7 How did you measure the roughly 60-90 seconds to 8-15 seconds improvement?

**The sequential baseline (before concurrency):**

In the earliest prototype, evaluations ran sequentially:
```python
results = []
for persona in personas:
    results.append(await evaluate_with_openai(persona, ...))
    results.append(await evaluate_with_xai(persona, ...))
    results.append(await evaluate_with_claude(persona, ...))
```
Each API call took 5-10 seconds (image processing + LLM inference + network). 9 calls × ~7 seconds average = **~63 seconds**. With retries on failures, it could reach 90 seconds.

**The concurrent version:**

Switching to `asyncio.gather()` with `Semaphore(3)` batches the 9 calls into 3 waves of 3 concurrent calls. Each wave takes ~7 seconds (bounded by the slowest provider in that wave). 3 waves × ~5 seconds average = **~15 seconds**. Best case (all providers fast): ~8 seconds.

**How this was measured:**

1. **Server-side timing**: `datetime.now()` timestamps at pipeline entry and exit, logged to stdout. The v2 pipeline records `started_at` and `completed_at` in the `evaluation_runs` table, plus per-attempt `elapsed_ms` from each provider adapter.
2. **Per-provider latency**: Each provider adapter records `elapsed_ms = int((end - start) * 1000)` in the `ProviderResponse` envelope. These are persisted in `evaluation_attempts.elapsed_ms`.
3. **Frontend observation**: The loading spinner duration in the UI was the user-visible confirmation — from button click to results render.

**The improvement is not exactly 9×** because:
- The semaphore caps at 3 concurrent, so it's 3 waves, not 9 parallel
- The recruiter step and synthesizer step run sequentially (they're not parallelizable)
- Network overhead isn't perfectly overlapped
- Actual improvement: ~4-6× (60-90s → 15-20s with recruiter + synthesis overhead)

---

### 13.8 What would break if requests or provider rate limits increased tenfold?

**Immediate bottlenecks at 10× scale:**

1. **Provider rate limits**: OpenAI, Anthropic, and xAI all have per-minute token and request limits. At 10× requests, we'd exceed rate limits within minutes. The current `_with_retry` backoff would cause cascading delays.
   - **Fix**: Implement a token bucket rate limiter per provider (e.g., `aiolimiter`), queue requests when approaching limits, and add circuit breakers that fail fast instead of retrying indefinitely.

2. **SQLite write contention**: SQLite serializes writes. At 10× concurrent evaluations (each writing 9 attempt rows + 9 judgment rows + 1 aggregate + 1 review + 1 report = ~21 writes per evaluation), WAL mode helps concurrent reads but writes still queue.
   - **Fix**: Migrate to PostgreSQL with connection pooling (`asyncpg` + `pgBouncer`).

3. **Memory pressure**: Each evaluation holds a base64 image (~200KB-1MB) in memory across 9 concurrent API calls. At 10× concurrent evaluations = 90 concurrent image payloads.
   - **Fix**: Stream images from disk per-call instead of holding in memory; reduce semaphore or use a dedicated image cache.

4. **FastAPI BackgroundTasks**: Currently used for async v2 evaluations. These run in-process and don't survive restarts. At 10× load, the event loop becomes the bottleneck.
   - **Fix**: Replace with Celery + Redis workers. Each worker handles one evaluation pipeline independently.

5. **Single-instance deployment**: Render runs one uvicorn process. A single Python process can handle ~100 concurrent I/O-bound requests, but 10× evaluations (each holding connections open for 15-45 seconds) would exhaust the connection pool.
   - **Fix**: Horizontal scaling with multiple uvicorn workers behind a load balancer.

6. **Cost explosion**: 10× evaluations = 10× API costs. Without per-user quotas, a single user could run up hundreds of dollars in API calls.
   - **Fix**: Per-user daily limits, cost tracking per evaluation, and an approval workflow for batch evaluations.

---

### 13.9 What did your GitHub Actions workflow actually run?

**Current state**: The project does **not** have a GitHub Actions CI/CD workflow (no `.github/workflows/` directory). Deployment is handled via Render's Git-based auto-deploy (push to main → Render rebuilds).

**What tests exist and how they're run locally:**

```bash
# From backend/, run pytest
pytest tests/ -v
```

The test suite covers:

| Test File | What It Tests | Key Assertions |
|-----------|--------------|----------------|
| `test_score_aggregator.py` (322 lines) | Deterministic `Fraction`/`Decimal` arithmetic | Exact match: `Fraction(39,9)` → display `"4.3"`, `Fraction(185,54)` → display `"3.43"`; ROUND_HALF_UP behavior; full scorecard computation from real exported chair data (13 chairs verified) |
| `test_judgment_validator.py` (227 lines) | Strict Pydantic v2 schema enforcement | Rejects: boolean scores, string scores (`"4"`), float scores (`4.5`), out-of-range scores (0, 6); validates evidence cross-references; rejects extra fields; rejects `scored` status with `null` score |
| `test_api_v2.py` (small) | v2 endpoint contract validation | Assignment contract creation and retrieval |

**If I were to add GitHub Actions**, the workflow would be:

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  backend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: '3.12' }
      - run: pip install -r backend/requirements.txt
      - run: cd backend && pytest tests/ -v --tb=short

  frontend-build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: cd frontend && npm ci && npm run build
      - run: cd frontend && npm run lint
```

The tests are deterministic (no API keys needed) because they test the score aggregator against hardcoded fixtures from real exported data, and the judgment validator against synthetic payloads. No mocking of LLM providers is required for these tests.

---

## 14. How to Prepare for Any Surprise Question

Interviewers probe for **depth, not breadth**. They want to see if you understand *why* things work, not just *what* they do. Here's a framework for handling any surprise question about this project.

### The 3-Layer Answer Framework

For any technical question, structure your answer in three layers:

1. **What** (5 seconds): State the direct answer.
2. **How** (15 seconds): Describe the mechanism — name the file, the function, the data flow.
3. **Why not the alternative** (10 seconds): Explain the trade-off you considered.

**Example:**

> *"How do you handle image uploads?"*

1. **What**: Pillow preprocesses the image (RGBA→RGB, resize to 1024px), then it's base64-encoded for OpenAI/xAI or uploaded via Claude's Files API.
2. **How**: In `evaluators.py`, `_detect_mime_type()` reads magic bytes. For Claude, the image is uploaded with `client.beta.files.upload()` and the `file_id` is passed in the message — this bypasses the 5MB base64 limit. The file is deleted in the `finally` block to avoid storage buildup.
3. **Why not the alternative**: We could send raw URLs, but the images are user-uploaded and not publicly hosted. Base64 inlining is the standard for private images. Claude's Files API was necessary because some design sketches exceeded 5MB.

### Mental Model: Trace the Data

For any "how does X work" question, trace the data through four checkpoints:

```
User Action → API Endpoint → Service Function → Storage/Response
```

If you can name the specific file and function at each checkpoint, you demonstrate ownership. For example:

- **"How are personas saved?"** → Evaluate.tsx `handleGenerateAndSave()` → `POST /personas/generate` → `agents.py:generate_personas()` → `persona_storage.py:save_personas()` → `data/personas.json`
- **"How is ICC computed?"** → `synthesizer.py:compute_icc_stats()` → `pingouin.intraclass_corr()` with `ICC2` model → stored in `stats.icc` field of the evaluation result JSON

### The "I Didn't Do This, But Here's What I'd Do" Pattern

For questions about features you haven't built (e.g., authentication, caching, WebSocket updates), use this pattern:

> *"The current system doesn't have [X]. If I were to add it, I'd use [specific technology] because [reason]. The integration point would be [specific file/function] because [architectural rationale]."*

This shows you understand the system well enough to extend it, even if you haven't built that feature yet.

### Common Traps to Avoid

| Trap | What they're testing | How to avoid |
|------|---------------------|-------------|
| "So the LLM calculates the final scores?" | Do you understand your own architecture? | "No — the LLM only returns reasoning text. All scores are computed server-side in `score_aggregator.py` using Python's `Fraction` type for exact arithmetic." |
| "Isn't 9 calls overkill?" | Can you justify research design? | "9 is the minimum for meaningful ICC(2) computation with 6 dimensions. Fewer raters produce unstable ICC estimates." |
| "Why not just use GPT-4o for everything?" | Do you understand model diversity? | "A mono-model panel shares training biases. Cross-provider variance is what makes the inter-rater statistics meaningful — it mirrors using judges from different institutions in human CAT panels." |
| "What's your test coverage?" | Are you honest about gaps? | Be honest: "Score aggregator and judgment validator have extensive tests with hardcoded fixtures. The LLM-dependent code paths (evaluators, recruiter, synthesizer) are tested manually because they require live API calls. If I had more time, I'd add mocked integration tests." |
| "How do you know the scores are accurate?" | Do you understand agreement vs. accuracy? | "ICC measures agreement, not accuracy. The thesis experiment compares AI panel ICC against human panel ICC from the same 46-chair dataset to measure alignment with human judgment." |

---

> **Built at the University of Oulu as a Master's thesis project — investigating whether multi-agent LLM panels can produce reliable creativity assessments comparable to human expert panels.**
