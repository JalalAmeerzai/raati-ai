# Raati Persona Independence and Result-Reuse Experiment

## Instructions for Antigravity

This is an executable engineering brief. Inspect the existing Raati repository, instrument the evaluation pipeline, run the experiment below, and produce an evidence-backed diagnosis.

The reported problem is that a cognitive-studies/research persona and newly generated furniture-industry personas produced the same numerical evaluations approximately 99% of the time. Determine where repetition first appears:

1. Completed results are being reused by the application.
2. Persona content is absent from the provider request.
3. An older frozen persona or panel version is still active.
4. Concurrent tasks share or capture the wrong persona/request object.
5. Different responses are collapsed during validation, persistence, aggregation, or display.
6. The same image bytes are accidentally sent for different submissions.
7. Calls are genuinely independent, but the shared rubric, image, deterministic settings, and 1–5 scale produce convergent scores.

Do not manufacture disagreement. The objective is to verify technical independence and meaningful professional-lens differentiation, not force personas to assign different numbers.

---

## 1. Non-negotiable rules

1. Run a baseline before changing prompts, score anchors, temperatures, models, or aggregation.
2. Use a development/test environment and database. Do not alter production research data.
3. Keep diagnostic changes behind a PERSONA_DIAGNOSTIC_MODE flag or in a separate harness.
4. Never expose API keys, authorization headers, cookies, signed URLs, or credentials.
5. Preserve redacted raw requests and raw provider responses for audit.
6. Provider prompt caching is not completed-answer caching. A cached input prefix can still produce a new output.
7. Treat personas within one foundation model as correlated experimental conditions, not independent human raters.
8. Do not count retries as independent evaluations.
9. Do not silently substitute models, personas, images, assignments, or mock results.
10. Do not delete or overwrite existing results.
11. If a provider is unavailable, report it. Never fabricate output.
12. Do not optimize the system merely to create disagreement.

---

## 2. Fixed assignment

Use this assignment verbatim in every experimental condition:

> Design an Easy Chair for the Design Center FSRD ITB, a space used for academic and non-academic activities such as guest lectures, seminars, workshops, sharing sessions, and meetings. The chair will primarily be used by speakers, guest speakers, and moderators, although it may also be used by students, lecturers, guests, and other visitors when no event is taking place. The intended users range approximately from 18 to 65 years old, and the chair should be suitable for sitting periods of around 1–3 hours. Your design should respond to the different ways people may sit during these activities. Users may sit upright or lean back, lean forward while taking notes, rest one or both arms on the armrests, hold a microphone, book, or laptop, cross one leg over the other, or sit with their legs positioned more widely. The chair should therefore provide a comfortable backrest for extended use, supportive armrests, and sufficient seat width to accommodate different sitting positions comfortably. Develop an Easy Chair solution that balances these functional and user needs with a clear and thoughtful design concept.

Store the exact UTF-8 text in the experiment manifest and calculate assignment_sha256 from those bytes. Do not summarize or rewrite it.

---

## 3. Repository discovery

Before editing:

1. Locate the repository root. Prefer the current directory when it contains the backend and frontend.
2. Read AGENTS.md, README files, environment documentation, and test instructions.
3. Identify:
   - current and legacy evaluation endpoints;
   - evaluation runner/orchestrator;
   - OpenAI and Anthropic adapters;
   - prompt/persona compilation;
   - persona, panel, assignment, and rubric version resolution;
   - response validation and normalization;
   - persistence and uniqueness constraints;
   - aggregation and report generation;
   - frontend polling and rendering;
   - application, Redis, HTTP, CDN, database, and client caches;
   - idempotency-key construction;
   - retry handling.
4. Record the Git commit and dirty-state summary. Preserve all existing user changes.
5. Determine the exact provider model identifiers and generation parameters used at runtime.
6. Do not assume filenames from this document; adapt to the real repository.

If the repository cannot be found, stop and ask for its path.

---

## 4. Image discovery

Look for this directory relative to the repository root:

    sample_images/

Supported files:

    .png
    .jpg
    .jpeg
    .webp

Ignore hidden files and generated thumbnails. Sort the chair files by the numeric suffix, not lexicographically. For example, design_2 must be processed before design_10.

### Canonical chair-name mapping

The 13 source images are named design_1, design_2, and so on. The extension may be PNG, JPG, JPEG, or WebP. Use the following fixed mapping throughout the experiment, manifests, CSV files, logs, and reports:

| Image basename | Canonical design name |
|---|---|
| design_1 | Tumpuan Chair |
| design_2 | Shizuku Chair |
| design_3 | Cayi Chair |
| design_4 | Sluma Chair |
| design_5 | Gee Chair |
| design_6 | Molten Chair |
| design_7 | Para Chair |
| design_8 | Crescent Chair |
| design_9 | LikaLiku Chair |
| design_10 | Fingie Chair |
| design_11 | Levica Chair |
| design_12 | PariPari Chair |
| design_13 | Lipat Chair |

Treat the basename case-insensitively when discovering files, but preserve the exact source filename in provenance. Do not infer a chair name from image content. Do not reorder this mapping based on model output. In every result row, store both source_image_basename and canonical_design_name.

Validate the mapping before provider calls:

- no duplicate numeric suffixes;
- no missing design numbers inside the selected range;
- each selected basename maps to exactly one canonical name;
- design_1 through design_13 are the only files included in the complete 13-chair run unless an additional file is explicitly labelled as a diagnostic control;
- the synthetic solid-grey control must use a non-design name such as diagnostic_blank_control and must never receive a chair name.

If an expected image is missing or two files share the same basename with different extensions, stop and ask the user which file is authoritative. Do not silently select one.

For each image record:

- relative path;
- source image basename;
- numeric design index;
- canonical design name from the fixed mapping;
- SHA-256;
- byte length;
- MIME type;
- pixel width and height;
- color mode when available.

The routing gate requires one image. The full experiment should use at least three distinct chair images.

If sample_images is missing or empty, stop before provider calls and ask:

> Please place at least three chair-design images in <repository-root>/sample_images. PNG, JPG, JPEG, and WebP are supported. Tell me when they are ready, and I will continue the diagnostic experiment.

If only one or two images exist, run the routing gate, then ask whether to continue with a limited comparison or wait for more images.

Create one synthetic solid-grey image as a negative control. Clearly label it as generated diagnostic input and never mix it into the research dataset.

---

## 5. Persona conditions

Use the application's actual active profiles. Do not replace them with invented profiles.

Expected conditions:

1. Cognitive studies / creativity research professional.
2. Practicing furniture designer / furniture-industry professional.
3. Human-centred product-design professional, if configured.

Resolve and record:

- persona_id;
- display_name;
- persona_version;
- full compiled persona text SHA-256;
- profile source;
- panel_version_id;
- assignment_version_id.

If multiple profiles could represent a condition and the active profile is ambiguous, stop and ask the user which profile to use.

Keep the CAT definitions and score anchors identical across personas. Personas may differ in professional evidence priorities, questions, uncertainties, interpretations, and recommendations. They must not receive different scoring scales or severity rules.

---

## 6. Static audit before provider calls

### 6.1 Endpoint routing

Confirm the endpoint used by the frontend. If both /evaluate and /api/v2/evaluate or similar routes exist, confirm that the current workflow invokes the intended versioned route.

Every newly requested evaluation must create a new run_id.

### 6.2 Frozen profile and panel versions

Determine whether assignments freeze their panels. Confirm that the diagnostic assignment references the intended current panel and not an older panel_version_id retained after persona updates.

A persona edit should create a new profile version. Activating it should create or select a new panel version. Existing frozen assignments should not silently change, but this experiment must explicitly use the intended versions.

### 6.3 Prompt assembly

Capture the exact compiled provider request. Confirm that persona content appears in the outbound request, rather than only in database metadata, recruiter output, or panel configuration.

Required logical structure:

    SYSTEM / SHARED INSTRUCTIONS
    Shared CAT rubric, score anchors, evidence rules, limitations, schema.

    PERSONA BLOCK
    Persona ID and version, professional background, evidence priorities,
    questions, scope, and inference limits.

    USER CONTENT
    Exact assignment, submission description if applicable, actual image.

A stable shared prefix may precede the persona block for prompt-cache efficiency. That is acceptable if the persona block is included before generation.

### 6.4 Completed-result cache and idempotency

Search for reuse based on insufficient identities such as:

    image_sha256
    submission_id
    submission_version_id
    provider + image_sha256
    provider + submission_id

Disable completed-result reuse in diagnostic mode. Every explicit experimental evaluation must create new provider calls.

Provider-side input-prefix caching may remain enabled. Log provider cached-input token fields when available, but do not treat a prompt-cache hit as completed-answer reuse.

### 6.5 Concurrency

Check for:

- async closures or lambdas capturing a loop variable;
- one mutable messages list reused across tasks;
- one mutable request dictionary reused across providers/personas;
- one response dictionary persisted multiple times;
- tasks indexed only by provider;
- retry output written into another slot.

Every task must receive an immutable slot object containing:

- run_id and slot_id;
- provider and exact model;
- persona ID and version;
- panel version;
- compiled persona content;
- assignment version;
- image identity;
- generation parameters.

### 6.6 Persistence and frontend identity

Confirm that records and UI components are keyed by provider and persona within a run.

Conceptual uniqueness rules:

    accepted_judgment: UNIQUE(run_id, slot_id)
    evaluation_attempt: UNIQUE(run_id, slot_id, attempt_number)
    slot_id: panel_version + persona_id + provider_configuration

A key based only on run_id plus provider can cause three persona results from one provider to overwrite each other.

---

## 7. Diagnostic provenance

Create one provenance record for every outbound attempt. Use existing observability storage if suitable; otherwise write JSON Lines into the diagnostic output directory.

Required fields:

    experiment_id
    run_id
    slot_id
    attempt_id
    attempt_number
    is_retry
    provider
    requested_model
    returned_model
    provider_request_id
    client_request_id
    assignment_version_id
    assignment_sha256
    panel_version_id
    persona_id
    persona_version
    persona_prompt_sha256
    rubric_version
    prompt_template_version
    schema_version
    image_relative_path
    image_sha256
    image_byte_length
    request_sha256
    raw_response_sha256
    validated_response_sha256
    persisted_judgment_sha256
    api_response_judgment_sha256
    temperature
    top_p
    seed
    input_tokens
    output_tokens
    provider_cached_input_tokens
    started_at
    completed_at
    status
    failure_stage
    error_type

Generate client_request_id before each outbound call. Capture the provider response/request ID from the SDK or response headers when exposed.

### Canonical request fingerprint

Calculate request_sha256 from canonical JSON containing every behavior-changing input:

    {
      "provider": "...",
      "model": "...",
      "shared_system_prompt": "...",
      "persona_id": "...",
      "persona_version": "...",
      "compiled_persona_prompt": "...",
      "assignment_text": "...",
      "submission_description": "...",
      "rubric_version": "...",
      "schema_version": "...",
      "image_sha256": "...",
      "generation_parameters": {}
    }

Use UTF-8, recursively sorted keys, and deterministic separators. Do not include timestamps, run IDs, or random request IDs in this fingerprint.

Different personas for the same provider and image must have different request fingerprints.

Hash the raw, validated, persisted, and API-returned judgments independently. Canonicalize structured JSON before hashing, while also retaining the original raw response.

---

## 8. Development-only persona canaries

Enable this only when PERSONA_DIAGNOSTIC_MODE=true.

Add these required fields to the diagnostic response schema:

    {
      "persona_id": "string",
      "persona_canary": "string",
      "primary_lens": "string",
      "lens_observation": "string"
    }

Use:

| Persona condition | Canary | Required lens |
|---|---|---|
| Cognitive/creativity research | COGNITIVE_B24 | Novelty, expectation, conceptual departure, or cognitive interpretation |
| Furniture industry/practice | FURNITURE_A17 | Structure, joint, component transition, material, ergonomics, or manufacturing |
| Human-centred design | HCD_C31 | User activity, posture, interaction, access, inclusion, or prolonged use |

Insert the selected persona ID, canary, and lens requirement into the actual provider request. Require the model to return the canary verbatim.

Do not instruct a persona to assign different scores. Require distinct evidence attention, not numerical disagreement.

For any other configured persona, generate a unique deterministic canary from its persona ID and save the mapping in the manifest.

Disable these fields outside diagnostic mode.

---

## 9. Experiment configuration and cost guard

Use configuration equivalent to:

    PERSONA_DIAGNOSTIC_MODE=true
    DISABLE_COMPLETED_RESULT_CACHE=true
    EXPERIMENT_MAX_PROVIDER_CALLS=60
    EXPERIMENT_REPETITIONS_GATE=2
    EXPERIMENT_REPETITIONS_FULL=2

Before calling providers, print and save:

- number of images;
- number of personas;
- number of providers;
- repetitions;
- planned calls;
- call cap;
- exact models.

Abort before exceeding the cap. Retries count toward provider calls but not independent repetitions.

Use OpenAI and Anthropic for the primary diagnosis. Include xAI only if already configured and the call cap permits it, or report it as an optional extension.

---

## 10. Phase A: routing and canary gate

Use the first valid chair image in deterministic filename order.

Conditions:

    1 image
    3 personas, or all currently active personas
    2 providers: OpenAI and Anthropic
    2 independent repetitions

With three personas, this is 12 calls.

For each repetition:

1. Create a new run_id.
2. Resolve the intended current panel/profile versions explicitly.
3. Build a fresh immutable request per slot.
4. Make a genuine provider call.
5. Record all provenance.
6. Validate persona ID and canary.
7. Trace the judgment through validation, persistence, API retrieval, aggregation, and frontend state when practical.

### Phase A hard-stop failures

Stop the broader experiment if:

- different personas have the same request fingerprint;
- the compiled request lacks the intended persona;
- a canary is missing, incorrect, or belongs to another persona;
- a new evaluation does not create a new run_id;
- an intended outbound call does not occur;
- one response is attached to multiple slots;
- slots for one condition receive unexpected image hashes;
- validated, persisted, or API content maps to the wrong slot;
- a legacy endpoint is unexpectedly used;
- an unintended old panel/profile version is resolved.

When a hard-stop defect is confirmed:

1. Identify the smallest root cause.
2. Preserve baseline evidence.
3. Fix it behind the diagnostic flag or in production-safe code.
4. Add an automated regression test.
5. Rerun Phase A.
6. Preserve before/after evidence.
7. Proceed only after Phase A passes.

---

## 11. Phase B: image and persona differentiation

Run only after Phase A passes.

Use up to three distinct chair images from sample_images. Select deterministically and record them.

Recommended conditions:

    3 chair images
    3 personas
    2 providers
    2 repetitions

This produces 36 chair-image calls. Together with Phase A, the cumulative planned total is 48 before controls and retries.

Use remaining capacity in this priority order:

1. all three chair images across personas and providers;
2. solid-grey control for the furniture persona with both providers;
3. additional control personas;
4. optional extra repetition.

Never exceed 60 calls without explicit user approval.

### Negative-control expectation

The solid-grey image must produce explicit insufficient-evidence limitations. It must not confidently describe furniture joints, materials, style, or ergonomics that are not visible.

Failure indicates inadequate evidence grounding, even if routing works.

---

## 12. Optional high-randomness diagnostic

Run this only when routing, versioning, image delivery, persistence, and canaries all pass, but entire raw responses remain exactly identical.

Use:

- a new run ID;
- no fixed seed, if a seed is currently used;
- a moderately higher supported temperature such as 0.7;
- the same assignment, image, providers, and personas;
- unchanged CAT definitions.

This is diagnostic only. Do not adopt a higher temperature as the production solution merely to create variation.

If responses remain byte-for-byte identical with different request fingerprints and new provider IDs, inspect mocks, fixtures, SDK interception, HTTP replay tooling, and application caches.

---

## 13. Metrics

Calculate separately by provider and across providers.

### 13.1 Technical independence

- planned slots versus actual outbound calls;
- unique client request IDs;
- unique provider request/response IDs;
- unique request fingerprints;
- canary accuracy by persona;
- profile/panel version accuracy;
- image-hash correctness;
- raw-to-validated mapping accuracy;
- validated-to-persisted mapping accuracy;
- persisted-to-API/UI mapping accuracy.

### 13.2 Numerical repetition

Using the canonical six-criterion order, calculate:

- exact six-score-vector equality rate;
- per-dimension equality rate;
- within-persona repeatability;
- between-persona equality for the same image/provider;
- between-provider equality for the same image/persona;
- number and percentage of unique score vectors.

Do not compare vectors with different criterion orders.

### 13.3 Content repetition

For evidence, rationale, limitations, and recommendations calculate:

- exact raw-response duplicate rate;
- exact canonical-JSON duplicate rate;
- exact normalized-text duplicate rate;
- token Jaccard similarity;
- sequence similarity, such as Python SequenceMatcher.

Do not require an external embedding service. If a versioned embedding pipeline already exists, semantic similarity may be supplementary.

For normalized text: use Unicode normalization, lowercase, collapsed whitespace, and removal of purely decorative punctuation. Retain numbers and design terminology. Preserve original hashes separately.

### 13.4 Persona-lens compliance

For each response record:

- correct canary: yes/no;
- correct persona ID: yes/no;
- lens observation present: yes/no;
- observation relevant to required lens: yes/no;
- visibly grounded: yes/no/uncertain;
- unsupported hidden-property inference: yes/no.

Use transparent rule-based keyword checks only as preliminary flags, followed by a clearly labelled manual-review table. Do not use the evaluated model as the sole judge of its own differentiation.

---

## 14. Root-cause classification

Use the first matching primary category, while noting secondary findings.

### A. Application completed-result reuse

Use when no new outbound call occurs, a previous provider response/ID is returned, or an incomplete cache/idempotency key retrieves an old judgment.

Fix:

- disable completed-result reuse for research runs;
- generate a new run for every explicit evaluation;
- if intentional reuse exists, key it by the complete request fingerprint and visibly label it reused.

### B. Persona routing or version defect

Use when request fingerprints are identical across personas, canaries are wrong, persona content is absent, or an obsolete profile/panel is resolved.

Fix:

- include the compiled persona in every outbound request;
- pass immutable slot configurations;
- activate/version the intended panel;
- assert persona ID, version, and canary in diagnostics.

### C. Validation, persistence, aggregation, or UI defect

Use when raw responses differ but later representations become identical or appear in wrong slots.

Fix:

- key every stage by run_id plus slot_id;
- include provider and persona in slot identity;
- remove shared mutable response objects;
- add end-to-end hash assertions.

### D. Image-routing defect

Use when different submissions dispatch the same bytes, an overwritten mutable URL is used, or the selected image is absent.

Fix:

- use immutable object identifiers/URLs or verified direct image content;
- hash images at upload and immediately before dispatch;
- do not use overwriteable paths such as current_image.png.

### E. Persona prompt dominance or insufficient differentiation

Use when technical routing passes, but qualitative outputs remain highly similar and fail the required lens checks.

Fix:

- require observable persona-specific evidence;
- require the lens-specific first observation;
- reduce overlapping generic expertise language;
- consider the two-stage architecture in Section 16;
- keep shared score anchors unchanged.

### F. Legitimate score convergence

Use when technical independence passes, canaries and professional evidence differ appropriately, raw outputs are not reused, but CAT scores remain equal.

Interpretation:

Different professional lenses independently reached the same ordinal judgment from the same image and shared rubric. This is not caching. Measure persona value through evidence coverage, uncertainty, and recommendations rather than forced disagreement.

---

## 15. Acceptance criteria

### Technical pass

All must hold:

- every intended slot makes a genuine provider call or has a documented provider failure;
- every new evaluation creates a new run_id;
- provider IDs are unique per genuine call when available;
- request fingerprints differ across personas;
- every response returns the correct persona ID and canary;
- every slot receives the intended image hash;
- no response maps to multiple slots;
- raw, validated, persisted, and API-returned content is traceable;
- no unintended legacy route or old profile/panel is used.

### Persona differentiation pass

All must hold:

- 100% canary accuracy; any miss requires investigation;
- each lens observation addresses the intended professional domain;
- qualitative output is not byte-for-byte reused across different persona requests;
- the negative control reports insufficient evidence;
- observations remain grounded in visible or supplied information.

Different numerical scores are not required.

### Critical failure

Any is critical:

- persona request fingerprints are identical;
- a wrong-persona canary appears;
- one provider result is stored under multiple persona slots;
- different files unexpectedly dispatch the same image bytes;
- an old judgment is returned without a new call or explicit reuse label;
- UI values cannot be traced to their provider responses.

---

## 16. Conditional two-stage architecture

Implement this only after the baseline and only for Category E, not as a substitute for fixing Categories A–D.

### Stage 1: persona-specific evidence extraction

Each persona examines the assignment and image without assigning CAT scores.

Example structure:

    {
      "persona_id": "furniture_industry_professional",
      "persona_version": 1,
      "persona_canary": "FURNITURE_A17",
      "observations": [
        {
          "feature": "rear-leg and backrest transition",
          "visible_evidence": "The rear support narrows at the backrest transition",
          "professional_interpretation": "The visible load path appears unresolved at concept stage",
          "relevant_criteria": ["feasibility", "level_of_detail"],
          "confidence": "medium"
        }
      ],
      "unknowns": [
        "Joinery method is not visible",
        "Dimensions and materials are not supplied"
      ]
    }

Every interpretation must point to visible evidence or supplied text. Hidden properties must be recorded as unknown.

### Stage 2: shared CAT scoring

The scorer receives:

- the original assignment;
- the original image;
- one persona's Stage 1 evidence;
- the shared CAT rubric and anchors.

It returns the six scores and explanations.

Rerun the same experiment and compare baseline versus two-stage behavior. Success means improved lens compliance and evidence diversity, not merely lower numerical equality.

Do not merge this architectural change automatically. Present before/after evidence for approval.

---

## 17. Automated regression tests

Add tests for:

1. Different personas produce different request fingerprints.
2. Persona ID and version appear in final provider payloads.
3. Diagnostic canaries match selected personas.
4. Concurrent tasks have distinct immutable request/message objects.
5. A new evaluation creates a new run ID.
6. Completed-result reuse is disabled in research/diagnostic mode.
7. One persona cannot overwrite another persona's accepted judgment.
8. The same image yields the same hash across intended slots.
9. Different image bytes yield different hashes.
10. Raw, validated, persisted, API, and UI content preserves slot identity.
11. The active frontend route cannot be confused with a legacy route.
12. Retries remain attached to the original slot and are not independent repetitions.

Provider mocks are acceptable for unit/integration tests of routing. The actual experiment must use genuine provider calls unless explicitly invoked in dry-run mode.

---

## 18. Outputs

Create:

    diagnostics/persona_independence/<UTC_TIMESTAMP>/

Required files:

    README.md
    manifest.json
    static_audit.md
    provider_attempts.jsonl
    slot_trace.csv
    score_results.csv
    score_equality_matrix.csv
    content_similarity.csv
    persona_lens_compliance.csv
    failures.jsonl
    FINAL_DIAGNOSIS.md

When privacy rules permit, also save:

    redacted_requests/
    raw_responses/
    validated_responses/

### manifest.json must include

- experiment ID and times;
- Git commit and dirty-state summary;
- exact assignment and hash;
- selected image metadata/hashes;
- personas and versions;
- assignment and panel versions;
- providers, models, and parameters;
- diagnostic flags;
- planned and actual call counts;
- retries;
- code files changed.

### FINAL_DIAGNOSIS.md must include

1. Plain-English executive conclusion.
2. Whether the 99%-same observation was reproduced.
3. Whether every result came from a genuine independent provider call.
4. The first pipeline stage where outputs became identical.
5. Evidence table containing request IDs/hashes, versions, canaries, and image hashes.
6. Numerical equality results.
7. Content similarity and persona-lens results.
8. Negative-control result.
9. Root-cause category.
10. Exact files/functions containing any defect.
11. Diagnostic/fix changes made.
12. Regression tests and results.
13. Before/after comparison if fixed.
14. Remaining limitations.
15. Whether existing evaluation data should be discarded and rerun.
16. Whether the two-stage architecture is warranted.

Do not claim provider caching caused the problem unless the trace demonstrates completed-response reuse. Distinguish provider prompt-prefix caching from application-level response reuse.

---

## 19. Research interpretation

Use these principles:

- Repeated CAT scores alone do not prove caching.
- Identical raw responses across distinct verified requests are more suspicious than identical integer vectors.
- A shared 1–5 rubric intentionally encourages convergence.
- Persona validity should be measured through professional evidence, uncertainty, and recommendations as well as scores.
- Three personas executed by one foundation model are correlated conditions, not independent professional raters.
- OpenAI and Anthropic are separate provider conditions; repeated calls are repeated model measurements, not additional human experts.
- This experiment assesses technical independence and persona differentiation. It does not establish equivalence to real furniture professionals.
- Optimize for grounded, auditable, professionally relevant judgment—not disagreement.

---

## 20. Completion checklist

- [ ] Repository and active evaluation path identified.
- [ ] sample_images found, or user asked to add images.
- [ ] Exact assignment stored and hashed.
- [ ] Active personas and versions resolved.
- [ ] Panel and assignment versions resolved.
- [ ] Runtime OpenAI and Anthropic models identified.
- [ ] Completed-result reuse and idempotency audited.
- [ ] Prompt assembly verified.
- [ ] Concurrency and mutable-state risks audited.
- [ ] Persistence uniqueness and frontend keys audited.
- [ ] Provenance instrumentation implemented.
- [ ] Persona canaries implemented behind a flag.
- [ ] Phase A completed and passed, or hard-stop defect documented.
- [ ] Confirmed defect fixed and covered by regression tests.
- [ ] Phase A rerun after any fix.
- [ ] Phase B completed within the call cap.
- [ ] Negative control evaluated.
- [ ] Score equality and content similarity calculated.
- [ ] Raw-to-UI trace verified.
- [ ] Root cause classified.
- [ ] Required output files created.
- [ ] Existing research-data validity addressed.
- [ ] Production prompts/temperature were not changed merely to force diversity.

---

## 21. Stop conditions and user questions

Stop and ask the user only when:

1. the repository cannot be found;
2. sample_images is missing or empty;
3. provider credentials/configuration are unavailable;
4. intended persona profiles are ambiguous;
5. more than 60 calls are required;
6. only production is available;
7. the experiment would overwrite existing research data.

State exactly what is missing, what has already been completed, and the one next action required.

---

## Final instruction

Begin with static tracing, not prompt rewriting. Establish whether different personas produce different outbound requests, providers are genuinely called, correct image bytes are dispatched, and outputs preserve their slot identity through the complete system. Run the 12-call canary gate first. Only after technical independence passes should you measure professional-lens differentiation. If CAT scores remain equal while persona evidence differs correctly, report legitimate score convergence rather than calling it caching.
