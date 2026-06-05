# PROJECT_DIGEST.md

## 1. Project identification

- **Project name**: raati.ai — Creativity Assessment Tool (`README.md:1`, `frontend/index.html:7`)
- **Description**: Raati AI is a multi-agent AI system that evaluates design creativity using the Consensual Assessment Technique (CAT) framework. Users upload a design sketch image and a text description. A "Recruiter Agent" (GPT-4o-mini) dynamically generates 3 domain-specific expert personas based on the submission context. Each persona is then evaluated by 3 independent LLM providers (OpenAI, xAI/Grok, Anthropic/Claude) in parallel, producing 9 total evaluations across 6 creativity dimensions on a 0–5 integer scale. A "Synthesizer Agent" (GPT-4o) merges the 9 results into a consensus report, and statistical reliability metrics (ICC, Kendall's W, variance analysis) are computed using Python's `pingouin` and `pandas` libraries. Results are persisted as JSON files and displayed via a React frontend with radar charts, accordion expert panels, and downloadable PDF reports.
- **Repository structure**:

| Directory/File | Description |
|---|---|
| `backend/` | Python FastAPI backend: API endpoints, LLM integration, statistical analysis, file storage |
| `backend/services/` | Core service modules: persona generation, multi-LLM evaluation, synthesis, storage, utilities |
| `backend/data/` | Runtime data: uploaded images, per-evaluation JSON results, CSV index |
| `frontend/` | React 19 + TypeScript + Vite SPA frontend |
| `frontend/src/pages/` | Six page components: Landing, HowItWorks, Dashboard, Evaluate, Results, History |
| `frontend/src/components/` | Shared components: Layout (sidebar + theme), LLMIcons (SVG brand icons) |
| `Docs/` | Reference research papers (PDFs) and architecture diagram images |

- **Languages and frameworks with versions** (from `frontend/package.json:1-43`, `backend/requirements.txt:1-8`):
  - Python 3.10+ (from `README.md:101`); no lockfile found — `requirements.txt` has no pinned versions
  - FastAPI (unpinned) (`requirements.txt:1`)
  - Uvicorn (unpinned) (`requirements.txt:2`)
  - openai SDK (unpinned) (`requirements.txt:3`)
  - anthropic SDK (unpinned) (`requirements.txt:4`)
  - pandas (unpinned) (`requirements.txt:7`)
  - pingouin (not listed in `requirements.txt` but imported at `synthesizer.py:5`) — **missing from requirements.txt**
  - React `^19.2.0` (`package.json:19`)
  - TypeScript `~5.9.3` (`package.json:39`)
  - Vite `^7.3.1` (`package.json:41`)
  - TailwindCSS `^4.1.18` (`package.json:38`)
  - Recharts `^3.7.0` (`package.json:22`)
  - Framer Motion `^12.34.0` (`package.json:15`)
  - jsPDF `^4.1.0` (`package.json:17`)
  - Axios `^1.13.5` (`package.json:13`)
  - react-router-dom `^7.13.0` (`package.json:21`)

- **Entry points**:
  - (a) Development backend: `python main.py` → runs `uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)` (`backend/main.py:147-149`)
  - (a) Development frontend: `npm run dev` → `vite` (`frontend/package.json:7`)
  - (b) Production: `npm run build` → `tsc -b && vite build` (`frontend/package.json:8`). No production backend deployment config found.
  - (c) Evaluation pipeline: `POST /evaluate` endpoint (`backend/main.py:38-54`) calls `evaluate_design()` (`backend/services/creativity_judge.py:63-99`)

## 2. High-level architecture

### Components

| Component | Role | Location | Interfaces |
|---|---|---|---|
| **FastAPI App** | HTTP API server | `backend/main.py` | `GET /`, `POST /evaluate`, `GET /results/{id}`, `GET /history`, `GET /analytics` (`main.py:32-145`) |
| **Recruiter Agent** | Generates 3 expert personas via GPT-4o-mini | `backend/services/agents.py` | `generate_personas(assignment_text) -> dict` (`agents.py:76-112`) |
| **Evaluator Panel** | Runs 3×3 fan-out: 3 personas × 3 LLM providers = 9 evaluations | `backend/services/evaluators.py` | `run_expert_panel(personas, desc, b64_img, img_bytes) -> list` (`evaluators.py:313-332`) |
| **Synthesizer** | Merges 9 results, computes statistics, generates consensus | `backend/services/synthesizer.py` | `synthesize(expert_results) -> dict` (`synthesizer.py:292-358`) |
| **Storage** | Saves images, JSON results, CSV index | `backend/services/storage.py` | `save_submission()`, `get_result_by_id()`, `get_history()` (`storage.py:30-154`) |
| **Creativity Judge** | Orchestrates full pipeline (recruiter → panel → synthesizer) | `backend/services/creativity_judge.py` | `evaluate_design(image_file, description) -> dict` (`creativity_judge.py:63-99`) |
| **React Frontend** | SPA with 7 routes | `frontend/src/` | Client-side routing via react-router-dom (`App.tsx:15-23`) |

### Data flow for ONE complete evaluation

1. **User uploads sketch + description** via `POST /evaluate` with `multipart/form-data` fields: `image` (file), `description` (string), `submitter_name` (string) (`main.py:38-43`)
2. **`evaluate_design()`** reads image bytes, base64-encodes them (`creativity_judge.py:67-70`)
3. **Recruiter Agent** calls `generate_personas(description)` → GPT-4o-mini generates 3 `Persona` objects with structured output via `client.beta.chat.completions.parse()` (`agents.py:82-98`, `creativity_judge.py:74-77`)
4. **Fan-out evaluation** calls `run_expert_panel()` which creates 9 async tasks (3 personas × 3 LLMs) and runs them concurrently via `asyncio.gather()` (`evaluators.py:313-332`, `creativity_judge.py:80-82`)
5. **Each evaluator function** (`evaluate_with_openai`, `evaluate_with_xai`, `evaluate_with_claude`) sends the persona prompt + rubric as system message and image + description as user message, receives JSON scores, computes `overall_score` as mean of 6 dimensions (`evaluators.py:122-191`, `evaluators.py:192-239`, `evaluators.py:241-311`)
6. **Synthesizer** filters valid results, computes ICC/Kendall's W/variance via `_compute_statistics()`, calls GPT-4o to merge scores and write feedback, calls GPT-4o again to translate stats to plain English (`synthesizer.py:292-358`)
7. **Storage** generates UUID, saves image to `data/images/{uuid}.ext`, saves full JSON to `data/results/{uuid}.json`, appends CSV row to `data/results.csv` (`storage.py:30-104`)
8. **Response** returned to frontend, which navigates to `/results/{id}` (`main.py:52-54`, `Evaluate.tsx:34-35`)

### Persistent storage

| Store | What is stored | Schema/Shape | Connection config |
|---|---|---|---|
| `backend/data/images/` | Uploaded sketch images | Binary files named `{uuid}.{ext}` | Path defined at `storage.py:14` |
| `backend/data/results/` | Full evaluation JSON (expert_panel + stats) | JSON with fields: id, timestamp, image_filename, description, 6 scores, 6 reasonings, 3 feedback fields, expert_panel array (9 items), stats object | Path defined at `storage.py:15` |
| `backend/data/results.csv` | Lightweight index for history listing | CSV with columns: id, timestamp, image_filename, description, overall_score, submitter_name | Path defined at `storage.py:16` |

No database is used. All storage is filesystem-based (`project_brief.md:115`).

### External service dependencies

| Service | Integration file | Auth mechanism | API key env var |
|---|---|---|---|
| OpenAI API | `backend/services/agents.py:12-13`, `backend/services/evaluators.py:125-126`, `backend/services/synthesizer.py:11-12` | API key via env var | `OPENAI_API_KEY` |
| xAI (Grok) API | `backend/services/evaluators.py:195-196` | API key via env var, OpenAI-compatible SDK with custom `base_url="https://api.x.ai/v1"` | `XAI_API_KEY` |
| Anthropic (Claude) API | `backend/services/evaluators.py:243-244` | API key via env var | `CLAUDE_API_KEY` |

## 3. Rubric specification

The exact list of rubric dimensions, in order as they appear in `SCORE_KEYS` (`evaluators.py:17-24`):

1. **CREATIVITY** — "The general inventiveness and ingenuity of the concept." Scale: 0–5 integers. (`evaluators.py:88`)
2. **ORIGINALITY** — "The extent to which the idea is unique and distinct from existing solutions." Scale: 0–5 integers. (`evaluators.py:89`)
3. **USEFULNESS_RELEVANCE** — "The practical value and applicability of the design to the problem." Scale: 0–5 integers. (`evaluators.py:90`)
4. **CLARITY** — "How well the idea is communicated and understood." Scale: 0–5 integers. (`evaluators.py:91`)
5. **LEVEL_OF_DETAIL_ELABORATION** — "The depth and completeness of the concept's description and visualization." Scale: 0–5 integers. (`evaluators.py:92`)
6. **FEASIBILITY** — "The technical and economic viability of implementing the design." Scale: 0–5 integers. (`evaluators.py:93`)

- **Anchor text per scale point**: No per-point anchors are defined. The only scale guidance is "0=Low, 5=High" (`evaluators.py:86`).
- **Single source of truth**: `FIXED_RUBRIC` string constant in `backend/services/evaluators.py:85-120`. An identical copy exists as `SYSTEM_PROMPT` in `backend/services/creativity_judge.py:24-61` (this copy appears unused in the current pipeline — the actual evaluators use `FIXED_RUBRIC` from `evaluators.py`).
- **Configuration method**: Hardcoded as a Python string constant (`evaluators.py:85-120`).
- **Rubric variants**: None found. All 9 evaluators share the same `FIXED_RUBRIC`. The `project_brief.md:122` mentions future "Customization Engine" for custom rubrics, but this is not implemented.

## 4. Persona / evaluator design

- **Total evaluators per submission**: 9 (3 personas × 3 LLM providers) (`evaluators.py:315-317`)
- **Axes of variation**: Persona (3 dynamically generated) × Provider (3 fixed: OpenAI, xAI, Claude). Full factorial — every persona is run on every provider (`evaluators.py:322-326`).

### Persona generation

Personas are **not static**. They are dynamically generated per submission by the Recruiter Agent. The system prompt for the Recruiter Agent is (`agents.py:25-73`):

```
You are the "Dean of Faculty" at an elite design and engineering university. Your task is to assemble a panel of 3 highly specialized expert judges to evaluate a student's design concept (which will consist of a sketch and a text description).

STEP 1 — DOMAIN ANALYSIS (Critical):
Before generating any personas, carefully analyze the Assignment Instructions to determine the TRUE NATURE of what is being evaluated. Ask yourself:

- Is this assignment primarily about VISUAL/ARTISTIC SKILL — such as sketching technique, drawing quality, line work, rendering, illustration, perspective drawing, construction lines, visual communication, or presentation quality?
- Is this assignment primarily about ENGINEERING/TECHNICAL DESIGN — such as materials selection, manufacturing feasibility, structural integrity, tolerances, real-world implementation, or regulatory compliance?
- Is this a MIXED assignment that requires both artistic/visual skill AND engineering/technical knowledge?

The subject matter (e.g., "mechanical flange", "bridge", "chair") does NOT automatically make it an engineering task. If the instructions focus on HOW TO DRAW or SKETCH the subject (viewpoints, construction lines, rendering techniques, presentation quality), then the evaluation domain is VISUAL/ARTISTIC, not engineering.

STEP 2 — PERSONA GENERATION:
Based on your domain analysis, generate THREE expert personas whose expertise matches what is ACTUALLY being evaluated:

- For VISUAL/ARTISTIC assignments: Select from experts like Technical Illustration Instructors, Sketching & Draftsmanship Specialists, Visual Communication Professors, Perspective Drawing Experts, Design Presentation Coaches, Architectural Rendering Specialists, Figure Drawing Instructors, etc.
- For ENGINEERING/TECHNICAL assignments: Select from experts like Materials Scientists, Manufacturing Engineers, Human Factors Specialists, Structural Engineers, Regulatory Affairs Specialists, etc.
- For MIXED assignments: Blend both categories appropriately, weighting toward whichever aspect the instructions emphasize more.

The 3 personas must evaluate the submission from distinct, complementary angles tailored exactly to the assignment's core challenges.

CRITICAL CONSTRAINTS:
- The "title" must be a dynamically generated, real-world, industry-standard job title perfectly suited to the assignment's ACTUAL evaluation domain (not just its subject matter).
- The "sub_text" must be a concise, UI-friendly summary (max 8 words) describing what specific aspect they are evaluating.
- The "prompt" MUST be exactly three sentences following the strict template provided in the JSON schema below. Do not add any extra rules, conversational text, or formatting.

You MUST output your response in valid JSON format matching this exact schema:
{
  "personas": [
    {
      "name": "A realistic professional name",
      "title": "A dynamically generated, real-world job title",
      "sub_text": "A short, punchy UI subtitle summarizing their focus.",
      "prompt": "You are an expert design critic and creativity researcher. Your task is to evaluate a design concept consisting of a sketch and a text description. As a [Insert Title Here], you will focus specifically on [Insert 1-2 specific technical details related to the assignment and their expertise]."
    },
    {
      "name": "A realistic professional name",
      "title": "A dynamically generated, real-world job title",
      "sub_text": "A short, punchy UI subtitle summarizing their focus.",
      "prompt": "You are an expert design critic and creativity researcher. Your task is to evaluate a design concept consisting of a sketch and a text description. As a [Insert Title Here], you will focus specifically on [Insert 1-2 specific technical details related to the assignment and their expertise]."
    },
    {
      "name": "A realistic professional name",
      "title": "A dynamically generated, real-world job title",
      "sub_text": "A short, punchy UI subtitle summarizing their focus.",
      "prompt": "You are an expert design critic and creativity researcher. Your task is to evaluate a design concept consisting of a sketch and a text description. As a [Insert Title Here], you will focus specifically on [Insert 1-2 specific technical details related to the assignment and their expertise]."
    }
  ]
}
```

- **Individual persona system prompts**: Since personas are dynamically generated, no static per-persona prompt exists in the codebase. Each generated persona's `prompt` field follows the three-sentence template shown above. At evaluation time, the persona prompt is concatenated with `FIXED_RUBRIC`: `system_prompt = f"{persona['prompt']}\n\n{FIXED_RUBRIC}"` (`evaluators.py:128`, `evaluators.py:198`, `evaluators.py:258`).
- **Design rationale for personas**: The Recruiter prompt contains embedded rationale: domain analysis distinguishes visual/artistic vs. engineering/technical assignments to ensure persona expertise matches what is actually being evaluated rather than the subject matter (`agents.py:28-35`). No separate design documents found.
- **Persona-to-provider mapping**: Full factorial — every persona is evaluated by all 3 providers (`evaluators.py:322-326`).

## 5. LLM provider integration

### OpenAI (Evaluator)
- **Model identifiers**: `gpt-5.2` (primary), `gpt-4o` (fallback on empty response) (`evaluators.py:131`, `evaluators.py:152`)
- **SDK**: `openai` Python SDK, `AsyncOpenAI` client (version unpinned in `requirements.txt:3`)
- **Integration file**: `backend/services/evaluators.py:122-190`
- **Auth**: `OPENAI_API_KEY` env var (`evaluators.py:125`)
- **Image sending**: Base64 inline via `data:{mime_type};base64,{base64_image}` in `image_url` content block (`evaluators.py:141`)
- **Structured output**: `response_format={"type": "json_object"}` (`evaluators.py:132`)
- **Temperature**: `0.1` (`evaluators.py:133`)
- **Max tokens**: `max_completion_tokens=2000` (`evaluators.py:134`), `max_tokens=2000` for fallback (`evaluators.py:155`)
- **Rate limit handling**: None found — no retry logic, no backoff.
- **Timeout/failure**: Catches generic `Exception`, returns error dict (`evaluators.py:188-190`). Fallback to `gpt-4o` only on empty response (`evaluators.py:149-167`).
- **JSON repair**: `_try_repair_truncated_json()` attempts to fix truncated JSON by appending closing characters (`evaluators.py:33-55`, called at `evaluators.py:174`)

### OpenAI (Recruiter Agent)
- **Model**: `gpt-4o-mini` (`agents.py:83`)
- **SDK**: `openai` `AsyncOpenAI`, using `client.beta.chat.completions.parse()` with Pydantic `response_format=RecruiterResponse` (`agents.py:82-94`)
- **Auth**: `OPENAI_API_KEY` (`agents.py:12`)
- **No temperature specified** (uses API default)

### OpenAI (Synthesizer)
- **Model**: `gpt-4o` for synthesis (`synthesizer.py:317`), `gpt-4o` for stat interpretation (`synthesizer.py:276`)
- **Temperature**: `0.1` for synthesis (`synthesizer.py:320`), `0.2` for stat interpretation (`synthesizer.py:278`)
- **Max tokens**: `1200` for synthesis (`synthesizer.py:321`), `200` for stat interpretation (`synthesizer.py:279`)

### xAI (Grok)
- **Model**: `grok-4-1-fast-reasoning` (`evaluators.py:201`)
- **SDK**: `openai` `AsyncOpenAI` with `base_url="https://api.x.ai/v1"` (`evaluators.py:196`)
- **Integration file**: `backend/services/evaluators.py:192-239`
- **Auth**: `XAI_API_KEY` env var (`evaluators.py:195`)
- **Image sending**: Base64 inline, same as OpenAI (`evaluators.py:211`)
- **Structured output**: `response_format={"type": "json_object"}` (`evaluators.py:204`)
- **Temperature**: `0.1` (`evaluators.py:202`)
- **Max tokens**: `2000` (`evaluators.py:203`)
- **Rate limit/retry**: None found.
- **JSON repair**: Same `_try_repair_truncated_json()` (`evaluators.py:222`)

### Anthropic (Claude)
- **Model**: `claude-sonnet-4-20250514` (`evaluators.py:261`)
- **SDK**: `anthropic` Python SDK, `AsyncAnthropic` client (version unpinned in `requirements.txt:4`)
- **Integration file**: `backend/services/evaluators.py:241-311`
- **Auth**: `CLAUDE_API_KEY` env var (`evaluators.py:243`)
- **Image sending**: Files API upload via `client.beta.files.upload()` with betas `["files-api-2025-04-14"]`, then referenced by `file_id` in message (`evaluators.py:251-274`). File is deleted after evaluation (`evaluators.py:301-311`).
- **Structured output**: System prompt instructs JSON output; response parsed with `json.loads()`. Markdown code fence stripping applied (`evaluators.py:283-286`). No `response_format` parameter used.
- **Temperature**: Not specified (uses API default). Note: `temperature` is not set in the Claude call (`evaluators.py:260-280`).
- **Max tokens**: `2000` (`evaluators.py:262`)
- **Rate limit/retry**: None found.
- **Cost tracking**: Not found in codebase.

## 6. Prompt composition pipeline

The prompt is assembled identically for all 3 providers (with minor provider-specific wrapping):

```python
system_prompt = f"{persona['prompt']}\n\n{FIXED_RUBRIC}"
```
(`evaluators.py:128`, `evaluators.py:198`, `evaluators.py:258`)

- **System message**: Contains the 3-sentence persona prompt (dynamically generated) followed by the full `FIXED_RUBRIC` text (6 dimensions, scoring instructions, feedback structure template, JSON output schema).
- **User message**: Contains `f"Design Description: {description}"` as text, plus the image (base64 for OpenAI/xAI, file reference for Claude). Claude additionally appends `"\n\nRespond with ONLY valid JSON matching the schema in your system prompt."` (`evaluators.py:276`).

**Provider-specific wrapping**:
- OpenAI/xAI: `system_prompt` goes in `messages[0]["role"]="system"`, image+text in `messages[1]["role"]="user"` with content array (`evaluators.py:135-144`, `evaluators.py:205-214`)
- Claude: `system_prompt` goes in dedicated `system=` parameter (not in messages), image+text in `messages[0]["role"]="user"` (`evaluators.py:264-279`)

**Prompt logging**: Responses are printed to stdout via `print()` statements (`evaluators.py:185-186`, `evaluators.py:233-234`, `evaluators.py:293-294`). No structured logging to file.

## 7. Score parsing and validation

- **Expected response schema** (Pydantic model `EvaluationResult`, `evaluators.py:70-83`):
```python
class EvaluationResult(BaseModel):
    creativity_score: int
    creativity_reasoning: str
    originality_score: int
    originality_reasoning: str
    usefulness_relevance_score: int
    usefulness_relevance_reasoning: str
    clarity_score: int
    clarity_reasoning: str
    level_of_detail_elaboration_score: int
    level_of_detail_elaboration_reasoning: str
    feasibility_score: int
    feasibility_reasoning: str
    instructor_feedback: str
```

- **Schema location**: `backend/services/evaluators.py:70-83`. Note: This Pydantic model is **defined but never used for validation** in the evaluation functions. All three evaluator functions parse responses with `json.loads()` directly, not via the Pydantic model (`evaluators.py:170`, `evaluators.py:218`, `evaluators.py:288`). The model exists only as documentation.
- **Validation logic**: Only `json.loads()` parsing. If parsing fails, `_try_repair_truncated_json()` attempts repair (`evaluators.py:33-55`). No field-level validation (e.g., score range checking).
- **Retry logic**: No retries on invalid response. OpenAI has a single fallback to `gpt-4o` only on **empty** response (`evaluators.py:149-167`), not on parse failure.
- **On final failure**: Returns error dict `{"model_provider": "...", "persona": ..., "error": "..."}` (`evaluators.py:180`, `evaluators.py:228`, `evaluators.py:300`). The failed evaluation is included in the expert_panel array but filtered out by the synthesizer (`synthesizer.py:298`).

## 8. Consensus aggregation

- **Aggregation function**: The final consensus scores are produced by **LLM synthesis**, not by a deterministic mathematical function. GPT-4o is instructed to "compute the MEAN score across ALL evaluations (round to 1 decimal place)" and produce synthesized reasoning (`synthesizer.py:39`). However, this is an LLM instruction, not verified code-level computation.
- **Synthesis code**: `synthesizer.py:316-332` — GPT-4o receives all 9 expert results as formatted text and returns a JSON with consensus scores and feedback.
- **Per-evaluator overall_score**: Each individual evaluator's `overall_score` IS computed deterministically as mean of 6 dimension scores: `round(sum(scores) / len(scores), 2)` (`evaluators.py:26-31`).
- **Within-panel variance**: Computed by `_compute_variance_analysis()` which uses `df.groupby("dimension")["score"].var()` (`synthesizer.py:139-148`).
- **Composite score across dimensions**: The synthesis prompt instructs GPT-4o that "overall_score must be the mathematical mean of ALL experts' dimension scores" (`synthesizer.py:46`).
- **Deliberation/debate**: Evaluations are **independent**. No multi-turn or multi-round deliberation occurs. All 9 evaluations run in parallel via `asyncio.gather()` with no inter-evaluator communication (`evaluators.py:331`).

## 9. Statistical analysis pipeline

### Statistics computed

| Statistic | Library/Function | Code location |
|---|---|---|
| Per-persona ICC | `pingouin.intraclass_corr()` | `synthesizer.py:159-164` |
| Overall ICC | `pingouin.intraclass_corr()` | `synthesizer.py:202-207` |
| Kendall's W | Custom implementation | `synthesizer.py:114-137` |
| Per-dimension variance | `pandas.DataFrame.groupby().var()` | `synthesizer.py:142` |
| Dimension with highest std | `pandas.DataFrame.groupby().std().idxmax()` | `synthesizer.py:252` |

### ICC type

The code calls `pg.intraclass_corr()` and then selects the row where `Type` is `ICC3` or `ICC2`:

- Per-persona ICC: `icc_row = icc_results[icc_results["Type"].isin(["ICC3", "ICC2"])].iloc[0]` (`synthesizer.py:165`). Since `.iloc[0]` is used and ICC3 appears before ICC2 in pingouin output order, this selects **ICC3** when available.
- Overall ICC: Same selection logic: `icc_results[icc_results["Type"].isin(["ICC2", "ICC3"])].iloc[0]` (`synthesizer.py:208`). Here the order is `["ICC2", "ICC3"]` but `.iloc[0]` still returns whichever appears first in the pingouin output DataFrame, which is ICC1 < ICC2 < ICC3 in row order — so this selects **ICC2**.
- The pingouin call uses `targets="dimension"`, `raters="model_provider"` (per-persona) or `raters="rater"` (overall, where rater = `model_provider + "_" + persona_id`) (`synthesizer.py:161-163`, `synthesizer.py:203-206`).
- ICC interpretation thresholds: ≥0.75 = "Excellent", ≥0.6 = "Good", ≥0.4 = "Moderate", <0.4 = "Poor" (`synthesizer.py:168-175`, `synthesizer.py:211-218`).

### Kendall's W implementation

Custom implementation (not from a library): ranks scores via `pivot.rank(method="average")`, computes sum of squared deviations from mean rank sum, applies formula `W = (12 * S) / (k² * (n³ - n))` (`synthesizer.py:114-137`).

### Output format

Statistics are embedded in the JSON response returned to the frontend as a `stats` object (`synthesizer.py:343-356`). They are also persisted in each evaluation's JSON file (`storage.py:78`). No separate Excel, CSV, or PDF statistical output is generated by the backend.

## 10. Frontend visualisation layer

### Routes

| Path | Component | File | Purpose |
|---|---|---|---|
| `/` | `Landing` | `frontend/src/pages/Landing.tsx` | Marketing landing page with animated constellation background, orbital LLM visualization, pipeline wizard |
| `/how-it-works` | `HowItWorks` | `frontend/src/pages/HowItWorks.tsx` | Interactive technical explainer with animated step visualizations, ICC demo, radar chart demos |
| `/dashboard` | `Dashboard` | `frontend/src/pages/Dashboard.tsx` | Main hub with recent submissions overview |
| `/evaluate` | `Evaluate` | `frontend/src/pages/Evaluate.tsx` | Image upload form + description input + submitter name |
| `/results/:id` | `Results` | `frontend/src/pages/Results.tsx` | Full evaluation report page |
| `/history` | `History` | `frontend/src/pages/History.tsx` | Searchable/filterable/sortable table of all submissions |

(`frontend/src/App.tsx:15-23`)

### Results page architecture (`Results.tsx`, 1071 lines)

The Results page is the most complex frontend component. Key sections:

- **Assessment Summary Card** (lines 656-861): Contains uploaded image (clickable for modal), description, submitter name, radar chart (Recharts `RadarChart` with `PolarGrid`, `PolarAngleAxis`, `Radar` for consensus data), dimension breakdown bars, and 5-section footer (Peak, Overview, Pivot, Next Step, Focus) showing best/weakest dimensions with reasoning.
- **Expert Panel** (lines 877-923): Tabbed interface where each tab represents a persona. Each tab shows 3 `LLMCard` sub-components (one per provider). Each `LLMCard` displays: provider icon+name, overall score, 6 dimension scores with individual bars, and reasoning text. Tab header shows persona name, title, and average score.
- **Statistics Panel** (lines 926-1034): Shows Overall ICC (with "Excellent"/"Good"/"Moderate"/"Poor" badge), Kendall's W, Average Dimension Variance, highest-variance dimension, and Per-Persona ICC3 list.
- **Image Modal** (lines 1039-1065): Full-screen lightbox with hover-reveal caption.
- **PDF Download** (lines 132-454): Entirely imperative — does NOT render DOM to PDF. Instead, uses `jsPDF` API calls to manually draw text, rectangles, and lines. Includes assessment summary, dimension scores table, per-expert breakdown, and statistical reliability section. Uses `Helvetica` font family. Output: A4 portrait, multi-page if needed (`Results.tsx:132-454`).

### Charting library

Recharts v3.7.0 (`package.json:22`). Used for:
- Radar charts on Results page (`Results.tsx:719-748`)
- Radar charts on HowItWorks demo (`HowItWorks.tsx:691-697`)

### Dark mode / theming

- Theme state managed via React Context in `Layout.tsx` using `useTheme()` hook (`Layout.tsx`).
- Persisted in `localStorage` key (likely "theme" — managed within Layout component).
- All components use conditional classes: `dark ? 'dark-class' : 'light-class'` pattern throughout.
- Toggle button available on Landing page navbar (`Landing.tsx:424-429`) and HowItWorks navbar (`HowItWorks.tsx:477-483`).

### Animation library

Framer Motion v12.34.0 (`package.json:15`). Used extensively:
- Landing page: constellation SVG background (`Landing.tsx:68-186`), orbital LLM system (`Landing.tsx:536-722`), pipeline wizard auto-advance (`Landing.tsx:188-360`).
- HowItWorks: constellation background (`HowItWorks.tsx:84-137`), typing text effect (`HowItWorks.tsx:140-169`), animated counter (`HowItWorks.tsx:172-202`), step visualizations.
- Page transitions: `AnimatePresence` with `mode="wait"` for step visuals (`HowItWorks.tsx:578-589`).

## 11. Deployment & infrastructure

- **Deployment configuration found**: None. No `Dockerfile`, `docker-compose.yml`, `Procfile`, Kubernetes manifests, Terraform, or CI/CD configuration files found in the repository.
- **Development server**: Backend runs via `uvicorn` with `reload=True` on port 8000 (`main.py:148`). Frontend runs via `vite dev` (default port 5173).
- **CORS**: `CORSMiddleware` configured with `allow_origins=["*"]`, `allow_methods=["*"]`, `allow_headers=["*"]` (`main.py:16-21`). This is a development-only configuration.
- **Static file serving**: Backend serves `backend/data/images/` at `/images/` route via FastAPI `StaticFiles` (`main.py:23`).
- **Process management**: Not applicable. No queue, worker, or process manager config found.
- **Scalability notes**: The 9 LLM API calls per submission are run concurrently via `asyncio.gather()` in a single process. No message queue (e.g., Celery/Redis) is used. The `project_brief.md:134` identifies this as a future improvement area.

## 12. Security and configuration

- **API key management**: All 3 API keys loaded via `os.environ.get()` (`agents.py:12`, `evaluators.py:125`, `evaluators.py:195`, `evaluators.py:243`, `synthesizer.py:11`). Stored in `backend/.env` file (gitignored via `.gitignore:5` and `backend/.gitignore:5`).
- **Input validation**: `POST /evaluate` expects `UploadFile` for image and `Form` string for description and submitter_name (`main.py:38-43`). No file type validation, no file size limits, no description length limits found in codebase.
- **Image handling**: Uploaded files stored directly to disk. File extension extracted from `content_type` (`storage.py:41`). No image sanitization or virus scanning.
- **CORS**: Wide-open `allow_origins=["*"]` (`main.py:17`). Not production-ready.
- **Authentication/authorization**: None. All endpoints are publicly accessible.
- **Rate limiting**: None found in backend code.
- **Data at rest**: No encryption. Plain JSON files and images on filesystem.
- **Secrets in codebase**: No hardcoded secrets found. `.env` file is gitignored.

## 13. Testing

- **Test files found**: None. No `test_*.py`, `*_test.py`, `*.test.ts`, `*.test.tsx`, `*.spec.*` files found anywhere in the repository.
- **Test framework configuration**: None. No `pytest.ini`, `conftest.py`, `jest.config.*`, `vitest.config.*` found.
- **CI/CD pipeline**: None found. No `.github/workflows/`, `.gitlab-ci.yml`, or similar.
- **TODO/FIXME markers**: None found in any source file.
- **Existing evaluation data**: 28 result JSON files exist in `backend/data/results/` (each ~33-48 KB), providing a dataset of real evaluation outputs that could be used for validation.

## 14. Known limitations and technical debt

1. **No pinned dependency versions**: `backend/requirements.txt` has no version pins. `pingouin` is imported (`synthesizer.py:5`) but **not listed in requirements.txt at all** — a silent dependency.
2. **No retry/backoff for LLM API calls**: All 3 provider integrations catch generic `Exception` and return error dicts. No exponential backoff, no rate limit handling, no circuit breaker pattern.
3. **Pydantic model unused for validation**: `EvaluationResult` model is defined (`evaluators.py:70-83`) but never used to validate responses. Raw `json.loads()` is used instead.
4. **Duplicated rubric**: `FIXED_RUBRIC` in `evaluators.py:85-120` and `SYSTEM_PROMPT` in `creativity_judge.py:24-61` contain overlapping rubric text. The `creativity_judge.py` copy appears unused in the active pipeline.
5. **No input validation**: No file type/size limits on uploads, no description sanitization.
6. **Synchronous pipeline**: No queue-based async processing. The `POST /evaluate` endpoint blocks until all 9 LLM calls + synthesis complete.
7. **Wide-open CORS**: `allow_origins=["*"]` is not suitable for production.
8. **No authentication**: All endpoints publicly accessible.
9. **Console logging only**: `print()` statements used for debugging output (`evaluators.py:185-186`, `evaluators.py:233-234`). No structured logging framework.
10. **Claude temperature not set**: Unlike OpenAI (0.1) and xAI (0.1), the Claude evaluator does not set a temperature parameter (`evaluators.py:260-280`), meaning it uses Anthropic's API default.

## 15. Reproducibility notes

To reproduce the system from source:

1. **Backend setup**: `cd backend && python -m venv venv && source venv/bin/activate && pip install -r requirements.txt && pip install pingouin` (pingouin must be installed separately as it's missing from requirements.txt)
2. **Environment variables**: Create `backend/.env` with `OPENAI_API_KEY`, `XAI_API_KEY`, `CLAUDE_API_KEY`
3. **Data directories**: `mkdir -p backend/data/images backend/data/results` (created automatically by `storage.py:17-20` on first run)
4. **Start backend**: `cd backend && python main.py` (runs on port 8000)
5. **Frontend setup**: `cd frontend && npm install`
6. **Start frontend**: `cd frontend && npm run dev` (runs on port 5173)
7. **Submit evaluation**: Navigate to `http://localhost:5173/evaluate`, upload image + description

**Non-determinism sources**: LLM API calls are the primary source of non-determinism. Temperature is set to 0.1 for OpenAI and xAI evaluators, 0.2 for stat interpretation, and unset (API default) for Claude and Recruiter Agent. Persona generation is inherently non-deterministic (different personas generated per submission). The `asyncio.gather()` execution order may vary but does not affect results since evaluations are independent.

## 16. Thesis-relevant research context

- **Thesis proposal** (`thesis_proposal.txt:1-8`): States the research question: "whether Agentic AI can reliably replicate or replace human evaluation" in creative design assessment using CAT. Proposes ICC for Inter-Rater Reliability comparison between AI and human baseline.
- **CAT framework notes** (`1. cat framework:1-12`): Notes mention "compare human with LLM", "scaling 0-7" (note: the implemented system uses 0-5, not 0-7), "human originality and usefulness, based on that creativity was assessed", and "apply ANOVA T-test for agent comparison" (note: ANOVA/T-test are NOT implemented in the current codebase — only ICC and Kendall's W are computed).
- **University affiliation**: University of Oulu (`Landing.tsx:759`, `HowItWorks.tsx:742`)
- **Reference papers**: The `Docs/` directory contains research papers (not readable as they are PDFs), and `README.md:178-226` lists references including Amabile (1982) on CAT, Shrout & Fleiss (1979) on ICC, Kendall & Smith (1939) on concordance.

## 17. Data schema — full evaluation JSON

Based on analysis of `storage.py:55-102` and `synthesizer.py:292-358`, each result JSON file contains:

```json
{
  "id": "uuid-string",
  "timestamp": "ISO-8601",
  "image_filename": "uuid.ext",
  "image_url": "/images/uuid.ext",
  "description": "user-provided text",
  "submitter_name": "user-provided name",
  "overall_score": 3.72,
  "creativity_score": 4, "creativity_reasoning": "...",
  "originality_score": 3, "originality_reasoning": "...",
  "usefulness_relevance_score": 4, "usefulness_relevance_reasoning": "...",
  "clarity_score": 3, "clarity_reasoning": "...",
  "level_of_detail_elaboration_score": 4, "level_of_detail_elaboration_reasoning": "...",
  "feasibility_score": 3, "feasibility_reasoning": "...",
  "instructor_feedback_intro": "...",
  "instructor_feedback_pivot": "...",
  "instructor_feedback_next_step": "...",
  "expert_panel": [
    {
      "persona": {"name": "...", "title": "...", "persona_id": "...", "sub_text": "..."},
      "model_provider": "openai|xai|claude",
      "result": {
        "creativity_score": 4, "creativity_reasoning": "...",
        "originality_score": 3, "originality_reasoning": "...",
        "usefulness_relevance_score": 4, "usefulness_relevance_reasoning": "...",
        "clarity_score": 3, "clarity_reasoning": "...",
        "level_of_detail_elaboration_score": 4, "level_of_detail_elaboration_reasoning": "...",
        "feasibility_score": 3, "feasibility_reasoning": "...",
        "instructor_feedback": "...",
        "overall_score": 3.5
      }
    }
    // ... 8 more entries (total 9)
  ],
  "stats": {
    "overall_icc": {"score": 0.89, "label": "Excellent", "message": "..."},
    "per_persona_icc": [
      {"persona_id": "...", "persona_name": "...", "icc": 0.92, "label": "Excellent"}
    ],
    "kendalls_w": {"W": 0.78, "p_value": null},
    "variance_analysis": {
      "per_dimension": {"creativity": 0.5, "originality": 0.8, ...},
      "average_variance": 0.65
    },
    "variance_message": "LLM-generated plain-English interpretation"
  }
}
```

## 18. API endpoint reference

| Method | Path | Request | Response | Code location |
|---|---|---|---|---|
| `GET` | `/` | — | `{"message": "Creativity Assessment API is running"}` | `main.py:32-34` |
| `POST` | `/evaluate` | `multipart/form-data`: `image` (file), `description` (string), `submitter_name` (string) | Full evaluation JSON (see §17) | `main.py:38-54` |
| `GET` | `/results/{result_id}` | Path param: UUID string | Full evaluation JSON from stored file | `main.py:57-68` |
| `GET` | `/history` | — | Array of history items from CSV (id, timestamp, image_filename, description, overall_score, image_url, submitter_name) | `main.py:71-88` |
| `GET` | `/analytics` | — | `{"total_evaluations": N, "average_score": X, "recent_evaluations": [...]}` | `main.py:91-145` |

## 19. Diagram-ready data for thesis figures

### Figure: 3×3 Fan-Out Matrix

```
                 ┌─────────────┐
                 │  Submission  │
                 │ (Image+Desc) │
                 └──────┬──────┘
                        │
                 ┌──────▼──────┐
                 │  Recruiter  │  GPT-4o-mini
                 │    Agent    │  (agents.py)
                 └──────┬──────┘
                        │
            ┌───────────┼───────────┐
            ▼           ▼           ▼
       Persona A   Persona B   Persona C
            │           │           │
      ┌─────┼─────┐ ┌───┼───┐ ┌────┼────┐
      ▼     ▼     ▼ ▼   ▼   ▼ ▼    ▼    ▼
     GPT  Grok Claude GPT Grok Claude GPT Grok Claude
      │     │     │   │   │   │   │    │    │
      └─────┴─────┴───┴───┴───┴───┴────┴────┘
                        │
                 ┌──────▼──────┐
                 │ Synthesizer │  GPT-4o
                 │   Agent     │  (synthesizer.py)
                 └──────┬──────┘
                        │
              ┌─────────┼─────────┐
              ▼         ▼         ▼
          Consensus  Statistics  Feedback
           Scores    (ICC, W)    Report
```

### Figure: Statistical Pipeline

```
9 Evaluations (3 personas × 3 LLMs)
        │
        ▼
  ┌─────────────────┐
  │ Build DataFrame │  scores flattened to rows:
  │ (rater, dim,    │  rater="openai_persona1"
  │  score)         │  dimension="creativity"
  └────────┬────────┘  score=4
           │
     ┌─────┼─────────────┐
     ▼     ▼             ▼
  Overall Per-Persona  Kendall's W
   ICC    ICC (×3)     (custom impl)
     │     │             │
     ▼     ▼             ▼
  ICC2   ICC3         W = 12S/k²(n³-n)
  (two-way (two-way
   mixed)  fixed)
     │     │             │
     └─────┴─────────────┘
           │
     ┌─────▼─────┐
     │ Variance  │  per-dimension
     │ Analysis  │  pandas .var()
     └─────┬─────┘
           │
     ┌─────▼─────┐
     │ GPT-4o    │  plain-English
     │ Interpret │  interpretation
     └───────────┘
```
