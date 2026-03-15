# 🎨 Raati AI — Creativity Assessment Tool

> A multi-agent AI system that evaluates design creativity using the **Consensual Assessment Technique (CAT)** framework — built as a thesis project at the **University of Oulu**.

[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React_19-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)](https://typescriptlang.org)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS_4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## ✨ What It Does

Students upload a **design sketch + description**, and a panel of **three independent AI judges** (powered by different LLM providers) evaluates the work across six creativity dimensions. The system then computes **inter-rater reliability** (ICC + ANOVA) and generates a detailed evaluation report — mirroring how the Consensual Assessment Technique works with human expert panels.

```
 Upload Sketch ──▶ Recruiter Agent ──▶ 3 AI Expert Judges ──▶ Synthesizer ──▶ Evaluation Report
  (image + desc)     (GPT-4o-mini)      (GPT-5.2 / Grok / Claude)  (GPT-4o)     (scores + stats)
```

---

## 🧠 Key Research Question

> _Can a multi-agent LLM panel produce reliable, agreement-consistent creativity assessments comparable to human expert panels?_

---

## 🏗️ Architecture

### Pipeline Overview

1. **Recruiter Agent** — A GPT-4o-mini "Dean of Faculty" dynamically generates 3 domain-specific expert personas based on the design context
2. **Expert Panel** — Three different LLM providers evaluate the design concurrently:
   | Judge | Model | Provider |
   |-------|-------|----------|
   | Expert 1 | GPT-5.2 | OpenAI |
   | Expert 2 | Grok-4-1-fast | xAI |
   | Expert 3 | Claude 3.5 Sonnet | Anthropic |
3. **Synthesizer** — GPT-4o merges all scores, generates unified instructor feedback, and computes ICC & ANOVA statistics
4. **Storage** — Results saved to CSV with uploaded images stored on disk

### Evaluation Rubric (0–5 scale × 6 dimensions)

| Dimension | What It Measures |
|-----------|-----------------|
| **Creativity** | General inventiveness and ingenuity |
| **Originality** | Uniqueness versus existing solutions |
| **Usefulness / Relevance** | Practical value and applicability |
| **Clarity** | Communication quality |
| **Level of Detail** | Depth and completeness |
| **Feasibility** | Technical and economic viability |

---

## 🖥️ Frontend Pages

| Page | Description |
|------|-------------|
| **Login** | Simulated Haka (Finnish university SSO) login |
| **Dashboard** | Drag-and-drop image upload + description input |
| **Results** | Full evaluation report with radar chart, expert cards, statistical reliability badges |
| **History** | Filterable table of all past submissions with color-coded score badges |
| **Analytics** | Score trend line chart + summary statistics |

---

## 🔌 API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | Health check |
| `POST` | `/evaluate` | Submit image + description for evaluation |
| `GET` | `/results/{id}` | Retrieve a single evaluation by ID |
| `GET` | `/history` | List all past evaluations |
| `GET` | `/analytics` | Aggregated stats and score trends |

---

## 📊 Statistical Methods

- **ICC(2)** — Intraclass Correlation Coefficient (two-way mixed, absolute agreement) via `pingouin`
- **Repeated-Measures ANOVA** — Tests for systematic rater bias across judges
- **Variance Detection** — Identifies the dimension with highest disagreement
- **LLM Interpretation** — GPT-4o translates raw statistics into plain-English labels

| Metric | Threshold | Meaning |
|--------|-----------|---------|
| ICC ≥ 0.75 | Excellent | Strong agreement between judges |
| ICC ≥ 0.60 | Good | Acceptable agreement |
| ICC ≥ 0.40 | Moderate | Some disagreement |
| ICC < 0.40 | Poor | Substantial divergence |
| ANOVA p < 0.05 | Significant | Systematic rater bias detected |

---

## 🚀 Getting Started

### Prerequisites

- **Python 3.10+** with `pip`
- **Node.js 18+** with `npm`
- API keys for: **OpenAI**, **xAI (Grok)**, **Anthropic (Claude)**

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd raati-ai
```

### 2. Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate   # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Create a `.env` file in the `backend/` directory:

```env
OPENAI_API_KEY=your_openai_key
XAI_API_KEY=your_xai_key
CLAUDE_API_KEY=your_claude_key
```

Start the server:

```bash
python main.py
# → API running at http://localhost:8000
```

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
# → App running at http://localhost:5173
```

---

## 📁 Project Structure

```
raati-ai/
├── backend/
│   ├── main.py                     # FastAPI app (5 endpoints)
│   ├── requirements.txt            # Python dependencies
│   ├── reset_data.py               # Data reset utility
│   ├── .env                        # API keys (not committed)
│   ├── data/
│   │   ├── results.csv             # Evaluation results
│   │   └── images/                 # Uploaded sketches
│   └── services/
│       ├── creativity_judge.py     # Pipeline orchestrator
│       ├── agents.py               # Recruiter agent (persona generation)
│       ├── evaluators.py           # Multi-LLM evaluators (OpenAI, xAI, Claude)
│       ├── synthesizer.py          # Score synthesis + ICC/ANOVA stats
│       └── storage.py              # CSV + image persistence
├── frontend/
│   ├── src/
│   │   ├── App.tsx                 # Router (5 routes)
│   │   ├── pages/
│   │   │   ├── Login.tsx           # Haka SSO simulation
│   │   │   ├── Dashboard.tsx       # Upload interface
│   │   │   ├── Results.tsx         # Full evaluation report
│   │   │   ├── History.tsx         # Past submissions table
│   │   │   └── Analytics.tsx       # Score trends & stats
│   │   └── components/
│   │       ├── Layout.tsx          # Shared sidebar layout
│   │       └── LLMIcons.tsx        # Provider brand icons
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.ts
├── Docs/                           # Reference research papers
└── project_brief.md                # Detailed project documentation
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | FastAPI · Uvicorn · Python 3.10+ |
| **LLM Providers** | OpenAI SDK · Anthropic SDK · xAI (OpenAI-compatible) |
| **Statistics** | pandas · pingouin (ICC + ANOVA) |
| **Frontend** | React 19 · TypeScript · Vite 7 |
| **Styling** | TailwindCSS 4 |
| **Charts** | Recharts |
| **Animations** | Framer Motion |
| **PDF Export** | html2canvas + jsPDF |
| **Icons** | Lucide React |
| **HTTP Client** | Axios |

---

## ⚙️ Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| 3 different LLM providers | Simulates multi-rater CAT; prevents single-model bias |
| Dynamic persona generation | Tailors expertise to each assignment's domain |
| Structured JSON output | Pydantic models ensure parseable, consistent data |
| Low temperature (0.1) | Maximizes determinism for reproducible evaluations |
| Concurrent evaluation | `asyncio.gather` runs all judges in parallel |
| ICC + ANOVA | Academically recognized inter-rater reliability measures |
| CSV storage | Simple and sufficient for thesis-scale data |

---

## 📝 License

This project was developed as part of a Master's thesis at the University of Oulu.

---

## 🙏 Acknowledgments

- **Consensual Assessment Technique (CAT)** — Teresa Amabile's framework for creativity assessment
- **University of Oulu** — Thesis supervision and research context
