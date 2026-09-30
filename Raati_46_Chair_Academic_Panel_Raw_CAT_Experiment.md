# Raati 46-Chair Academic Panel Raw CAT Evaluation

## Final execution specification for Antigravity

## 1. Purpose

Run a blind, evidence-gated CAT-informed evaluation of all 46 Easy Chair designs using:

- three frozen academic design personas;
- OpenAI;
- Anthropic;
- xAI;
- the same six CAT dimensions;
- the same 1–5 integer scale;
- one accepted evaluation per provider–persona–chair slot.

The objective is to produce a complete raw numerical dataset that can later be matched with the professional human ratings in the Excel file and analysed independently.

Do not run the synthesizer. Do not generate a consensus narrative. Do not generate a final overall score. Do not expose the AI evaluators to the human Excel ratings.

The required statistical dataset is the six raw CAT scores from every provider–persona combination.

Expected scoring observations:

    46 chairs
    × 3 providers
    × 3 academic personas
    = 414 provider–persona judgments

Expected criterion-level rows:

    414 judgments
    × 6 CAT criteria
    = 2,484 rows

The chair is the independent design unit. The 2,484 criterion observations must not later be treated as 2,484 independent designs.

---

## 2. Mandatory precondition: evidence-gated pipeline

Do not begin the 46-chair run using the earlier ungated pipeline.

The experiment must use a frozen evidence-gated system version, such as:

    design-assessment-v3-evidence-gated

Before this experiment, confirm that the system passes the visual-grounding regression tests for:

- solid-grey image;
- solid-black image;
- solid-white image;
- transparent image;
- corrupt file;
- unrelated non-chair object;
- heavily blurred chair;
- cropped/partially visible chair;
- valid chair image;
- valid chair with misleading textual description.

Required behaviour:

- obvious invalid images return unassessable;
- unassessable images receive null scores, not score 1;
- no overall score is generated for unassessable input;
- valid chairs remain assessable;
- unsupported visual features are not invented;
- image hashes match the bytes dispatched to each provider.

If this regression suite has not passed, stop and ask the user to complete the visual-grounding implementation before spending provider calls on the 46-chair dataset.

Do not mix results from the old ungated pipeline with results from this experiment.

---

## 3. Fixed assignment

Use this assignment verbatim for every chair, provider and persona:

> Design an Easy Chair for the Design Center FSRD ITB, a space used for academic and non-academic activities such as guest lectures, seminars, workshops, sharing sessions, and meetings. The chair will primarily be used by speakers, guest speakers, and moderators, although it may also be used by students, lecturers, guests, and other visitors when no event is taking place. The intended users range approximately from 18 to 65 years old, and the chair should be suitable for sitting periods of around 1–3 hours. Your design should respond to the different ways people may sit during these activities. Users may sit upright or lean back, lean forward while taking notes, rest one or both arms on the armrests, hold a microphone, book, or laptop, cross one leg over the other, or sit with their legs positioned more widely. The chair should therefore provide a comfortable backrest for extended use, supportive armrests, and sufficient seat width to accommodate different sitting positions comfortably. Develop an Easy Chair solution that balances these functional and user needs with a clear and thoughtful design concept.

Store the exact UTF-8 text and its SHA-256 in the experiment manifest.

Do not summarize, rewrite, expand or personalize the assignment between calls.

---

## 4. Blind evaluation requirement

The AI evaluation must be performed without access to:

- Professional Human Evaluation.xlsx;
- human CAT scores;
- human chair rankings;
- H/M/L category labels;
- earlier AI consensus scores;
- earlier synthesizer feedback;
- statistical results from the previous 13-chair study.

Antigravity may use the Excel file only after provider evaluations are complete and only for a separate mapping-integrity check if explicitly instructed later.

The provider prompts must contain only:

- frozen shared evaluation contract;
- selected academic persona;
- exact assignment;
- provider-specific image-only evidence record;
- chair image;
- CAT schema and anchors.

This prevents the AI scores from being contaminated by the human reference values.

---

## 5. Image folder

Read source images from:

    <repository-root>/sample_images/

Supported extensions:

    .png
    .jpg
    .jpeg
    .webp

Ignore hidden files, controls, thumbnails and temporary files.

Sort by the integer after design_, not lexicographically. For example:

    design_2 before design_10

The complete production run must contain exactly one authoritative image for each basename from design_1 through design_46.

Stop if:

- any design number is missing;
- a duplicate number exists;
- the same basename appears with more than one extension;
- a file cannot be decoded;
- an extra design image cannot be identified;
- the filename-to-chair mapping is ambiguous.

Do not silently choose among duplicates.

---

## 6. Authoritative 46-chair mapping

This mapping supersedes the earlier partial 13-chair mapping.

In particular:

    design_9 = Fingie Chair
    design_10 = LikaLiku Chair

Use the following order exactly:

| Design index | Image basename | Dataset chair name | Normalized chair name |
|---:|---|---|---|
| 1 | design_1 | Tumpuan Chair | Tumpuan Chair |
| 2 | design_2 | Shizuku Chair | Shizuku Chair |
| 3 | design_3 | Cayi Chair | Cayi Chair |
| 4 | design_4 | Sluma Chair | Sluma Chair |
| 5 | design_5 | Gee Chair | Gee Chair |
| 6 | design_6 | Molten Chair | Molten Chair |
| 7 | design_7 | Para Chair | Para Chair |
| 8 | design_8 | Crescent Chair | Crescent Chair |
| 9 | design_9 | Fingie Chair | Fingie Chair |
| 10 | design_10 | LikaLiku Chair | LikaLiku Chair |
| 11 | design_11 | Levica Chair | Levica Chair |
| 12 | design_12 | PariPari Chair | PariPari Chair |
| 13 | design_13 | Lipat Chair | Lipat Chair |
| 14 | design_14 | Mazico Chair | Mazico Chair |
| 15 | design_15 | Flow Chair | Flow Chair |
| 16 | design_16 | Escadafer Chair | Escadafer Chair |
| 17 | design_17 | Slant Ease Chair | Slant Ease Chair |
| 18 | design_18 | Tanged Chair | Tanged Chair |
| 19 | design_19 | Twistair Chair | Twistair Chair |
| 20 | design_20 | Kurusu Chair | Kurusu Chair |
| 21 | design_21 | Orocha Chair | Orocha Chair |
| 22 | design_22 | Nine Chair | Nine Chair |
| 23 | design_23 | Caprice Chair | Caprice Chair |
| 24 | design_24 | Zaft Chair | Zaft Chair |
| 25 | design_25 | Petal Chair | Petal Chair |
| 26 | design_26 | Onda Chiar | Onda Chair |
| 27 | design_27 | Winx Chair | Winx Chair |
| 28 | design_28 | Marlow Chair | Marlow Chair |
| 29 | design_29 | Bean Chair | Bean Chair |
| 30 | design_30 | Rest n Tea Chair | Rest n Tea Chair |
| 31 | design_31 | Sawala Chair | Sawala Chair |
| 32 | design_32 | Milin Chair | Milin Chair |
| 33 | design_33 | Riris Chair | Riris Chair |
| 34 | design_34 | Biram Chair | Biram Chair |
| 35 | design_35 | Pistache Chair | Pistache Chair |
| 36 | design_36 | Mobi Chair | Mobi Chair |
| 37 | design_37 | Bloom Chair | Bloom Chair |
| 38 | design_38 | Cervidae Chair | Cervidae Chair |
| 39 | design_39 | Sucro Chair | Sucro Chair |
| 40 | design_40 | Pingoo Chair | Pingoo Chair |
| 41 | design_41 | Bloma Chair | Bloma Chair |
| 42 | design_42 | Nuve Chair | Nuve Chair |
| 43 | design_43 | Liku Chair | Liku Chair |
| 44 | design_44 | Ropie Chair | Ropie Chair |
| 45 | design_45 | Tilage Chair | Tilage Chair |
| 46 | design_46 | Tana Chair | Tana Chair |

Preserve both dataset_chair_name and normalized_chair_name in every output file.

Do not silently rewrite the dataset label Onda Chiar. The normalized alias Onda Chair is included for later matching. The final statistical join must inspect the Excel spelling before choosing the authoritative publication label.

---

## 7. Image manifest

Before provider calls, create image_manifest.csv with exactly 46 rows and these columns:

    design_index
    image_basename
    exact_filename
    dataset_chair_name
    normalized_chair_name
    file_extension
    MIME_type
    byte_length
    pixel_width
    pixel_height
    color_mode
    image_sha256
    deterministic_file_check_status

Every image must have a unique SHA-256 unless the source dataset genuinely contains byte-identical duplicates. If duplicates are found, stop and report them before evaluation.

---

## 8. Academic persona panel

Use exactly three existing academic personas.

All three must represent relevant but complementary academic design expertise, for example:

- creativity/cognitive design research;
- visual communication/design representation;
- human-centred design/ergonomics research.

Do not recruit or generate new personas during the experiment.

Do not switch personas between chairs.

Do not modify personas after seeing any scores.

Before evaluation, create persona_manifest.csv:

    persona_slot
    persona_id
    persona_name
    persona_version
    full_profile_sha256
    primary_academic_domain
    panel_version_id
    activated_at
    canary

Required properties:

- exactly three persona rows;
- unique persona IDs;
- unique canaries;
- frozen versions;
- one academic panel_version_id;
- identical persona configuration across all 46 chairs.

If the active three academic personas are ambiguous, stop and ask the user to confirm them.

Persona slots must be stable:

    ACADEMIC_1
    ACADEMIC_2
    ACADEMIC_3

Do not call them independent human experts in the output. They are three persona conditions applied to each provider.

---

## 9. Providers and model versions

Use:

- OpenAI;
- Anthropic;
- xAI.

Prefer the exact model versions used in the completed crossover experiment for comparability:

    OpenAI: gpt-4o
    Anthropic: claude-sonnet-4-6
    xAI: grok-4-1-fast-reasoning

Before starting, verify that each exact configured model accepts image inputs in the current runtime.

If a model must be changed:

1. stop;
2. document the reason;
3. create a new experiment version;
4. obtain user approval;
5. do not combine old-model and new-model results without explicit stratification.

Freeze and record:

    provider
    requested_model
    returned_model
    temperature
    top_p
    seed_if_supported
    image_detail_setting
    maximum_output_tokens
    response_schema_version
    provider_adapter_version

Use the same settings for all chairs and personas within a provider.

---

## 10. Two-stage evidence-gated execution

### Stage 1: image-only visual evidence

Run one neutral image-only evidence extraction for each chair and provider:

    46 chairs × 3 providers = 138 image-evidence calls

Do not include:

- assignment;
- CAT rubric;
- persona;
- chair name;
- expected design description;
- human score;
- dataset category.

The provider should see only the image and the neutral visual-evidence schema.

Required Stage 1 fields:

    experiment_id
    design_index
    image_sha256
    provider
    model
    visual_status
    detected_object
    object_confidence
    image_quality
    visible_evidence_items
    limitations
    provider_request_id
    semantic_request_sha256
    raw_response_sha256

Allowed visual_status values:

    assessable
    partially_assessable
    unassessable

If unassessable:

- do not generate CAT scores for that provider;
- do not convert missing scores to 1;
- create placeholder numeric records with null scores and status not_run_unassessable;
- preserve the abstention.

Reuse the accepted provider-specific Stage 1 evidence record across that provider's three academic personas for the same chair. Do not rerun visual extraction separately for every persona.

### Stage 2: academic CAT scoring

For every assessable chair/provider evidence record, run the three academic persona conditions:

    46 chairs
    × 3 providers
    × 3 personas
    = 414 CAT-scoring slots

The scoring request receives:

- shared CAT definitions and anchors;
- one frozen academic persona;
- exact assignment;
- original chair image;
- that provider's accepted Stage 1 evidence;
- minimal numeric output schema.

Each criterion must return:

    assessment_status
    integer_score_or_null
    supporting_evidence_ids

Allowed assessment_status values:

    assessed
    insufficient_evidence
    not_run_unassessable
    provider_failure

A non-null score must be an integer from 1 through 5.

A score must be null when assessment_status is not assessed.

Each assessed score must cite at least one evidence ID produced by Stage 1.

Do not ask for:

- synthesized feedback;
- final consensus;
- cross-persona comparison;
- overall chair score;
- human-score prediction;
- ranking of all chairs;
- publication interpretation.

The agent's job is data generation and integrity validation, not statistical interpretation.

### Expected provider-call count

If every image is assessable:

    Stage 1: 138 calls
    Stage 2: 414 calls
    Total:   552 calls

Print the planned call count and estimated provider cost before execution.

Require explicit user approval if the planned cost exceeds the configured experiment budget.

---

## 11. Fixed CAT criteria and order

Use this canonical order everywhere:

1. creativity
2. originality
3. usefulness_relevance
4. clarity
5. level_of_detail
6. feasibility

Scores must remain integers from 1 to 5.

Do not reorder criteria by provider.

Do not rename criteria between files.

Do not calculate or request an overall score. The statistical analysis will calculate composites independently from the six raw values.

---

## 12. Execution order and independence

Use stateless requests.

Do not pass:

- earlier chair responses;
- other providers' scores;
- other personas' scores;
- running panel averages;
- previous human results;
- summaries of earlier chairs.

Randomize execution order using one recorded deterministic shuffle seed while preserving the final output order by design_index.

Record the shuffle seed and actual call sequence.

Concurrent execution is allowed, but every task must receive an immutable slot containing:

    run_id
    design_index
    image_sha256
    provider
    model
    persona_id
    persona_version
    panel_version_id
    Stage_1_evidence_sha256
    assignment_sha256
    rubric_version
    prompt_version
    generation_parameters

Do not reuse mutable message arrays or response dictionaries across tasks.

---

## 13. Retry and failure policy

A retry is not a new independent rating.

Allow retries only for:

- network errors;
- rate limits;
- provider timeouts;
- malformed structured output;
- transient provider errors.

Do not retry merely because:

- the score appears surprising;
- the provider disagrees with another provider;
- the score differs from a human rating;
- the provider abstains appropriately;
- the result lowers agreement.

Use a predefined maximum retry count and record every attempt.

Accept the first valid schema-compliant response.

Never select the response closest to an expected score.

If the slot remains failed:

- leave scores null;
- record provider_failure;
- do not reuse a previous response;
- do not impute;
- include the failed slot in failures.csv.

---

## 14. Required primary output: raw_cat_scores_long.csv

This is the most important file for the final statistical analysis.

It must contain exactly one row for every:

    chair × provider × persona × criterion

Expected rows:

    46 × 3 × 3 × 6 = 2,484

Create placeholder rows with null scores for abstentions/failures so the structural row count remains 2,484.

Required columns:

    experiment_id
    pipeline_version
    run_id
    design_index
    image_basename
    exact_image_filename
    dataset_chair_name
    normalized_chair_name
    image_sha256
    assignment_sha256
    rubric_version
    panel_version_id
    persona_slot
    persona_id
    persona_name
    persona_version
    persona_profile_sha256
    provider
    requested_model
    returned_model
    visual_status
    stage_1_evidence_sha256
    evaluation_status
    criterion
    score
    supporting_evidence_count
    accepted_attempt_number
    execution_call_id
    provider_request_id
    semantic_request_sha256
    raw_response_sha256
    started_at_UTC
    completed_at_UTC

Rules:

- criterion must use the six canonical snake-case names;
- score must be integer 1–5 or empty/null;
- score must never contain an average or decimal;
- one unique row per design_index + provider + persona_id + criterion;
- no duplicate primary keys;
- no missing structural rows;
- no synthesized values.

Recommended CSV encoding:

    UTF-8
    comma delimiter
    RFC 4180-compatible quoting
    Unix or consistent line endings

---

## 15. Secondary output: raw_cat_scores_wide.csv

Create exactly one row per chair–provider–persona judgment.

Expected rows:

    46 × 3 × 3 = 414

Required columns:

    experiment_id
    run_id
    design_index
    image_basename
    dataset_chair_name
    normalized_chair_name
    image_sha256
    panel_version_id
    persona_slot
    persona_id
    persona_name
    persona_version
    provider
    requested_model
    returned_model
    visual_status
    evaluation_status
    creativity
    originality
    usefulness_relevance
    clarity
    level_of_detail
    feasibility
    accepted_attempt_number
    provider_request_id
    semantic_request_sha256
    raw_response_sha256

Do not include an overall or consensus column.

The six score columns must reproduce the long file exactly.

---

## 16. Additional required files

### visual_evidence.jsonl

One accepted image-only evidence record per chair and provider:

    46 × 3 = 138 records

Include unassessable records.

### run_status.csv

One row per planned Stage 2 slot:

    414 rows

Columns:

    run_id
    design_index
    provider
    persona_id
    planned
    attempted
    completed
    evaluation_status
    attempt_count
    error_type
    error_message_redacted
    provider_request_id
    token_usage
    latency_ms

### image_manifest.csv

Exactly 46 rows as defined above.

### persona_manifest.csv

Exactly three frozen academic persona rows.

### provider_manifest.csv

Exactly three provider rows with model/settings/version details.

### failures.csv

One row per failed attempt or failed slot. Include headers even if there are zero failures.

### experiment_manifest.json

Include:

- experiment ID;
- pipeline Git commit;
- dirty-working-tree status;
- pipeline version;
- assignment text and hash;
- rubric version;
- response schema version;
- panel version;
- complete persona manifest;
- complete provider manifest;
- image manifest reference;
- shuffle seed;
- planned and actual call counts;
- retry counts;
- started/completed timestamps;
- software environment;
- exclusions or deviations;
- data file hashes.

### validated_numeric_responses.jsonl

One compact validated record per planned Stage 2 slot, including null placeholders.

Do not include a synthesizer response.

### README.md

Explain:

- experiment purpose;
- call counts;
- file schemas;
- whether all 46 images were included;
- any abstentions/failures;
- whether expected row counts passed;
- how to import the CSVs;
- exact command/tests used for validation.

---

## 17. Output package

Create:

    Raati_46_Chair_Academic_Panel_Raw_CAT_Output/

Place the required files inside it.

Then create:

    Raati_46_Chair_Academic_Panel_Raw_CAT_Output.zip

The ZIP should contain only:

- README.md;
- raw_cat_scores_long.csv;
- raw_cat_scores_wide.csv;
- visual_evidence.jsonl;
- validated_numeric_responses.jsonl;
- run_status.csv;
- image_manifest.csv;
- persona_manifest.csv;
- provider_manifest.csv;
- failures.csv;
- experiment_manifest.json.

Do not include:

- API keys;
- authorization headers;
- full environment-variable dumps;
- private signed URLs;
- synthesizer output;
- generated reports that alter or summarize scores;
- the human Excel workbook;
- human ratings.

Raw provider prose may be retained securely in the repository audit directory, but it is not required in the final statistical handoff ZIP unless an anomaly requires inspection.

---

## 18. Mandatory completeness validation

Before packaging, assert:

    image_manifest rows = 46
    persona_manifest rows = 3
    provider_manifest rows = 3
    visual_evidence records = 138
    raw_cat_scores_wide rows = 414
    raw_cat_scores_long rows = 2,484
    run_status rows = 414

Also assert:

- design indexes are exactly 1 through 46;
- each design has exactly nine wide-format judgment rows;
- each design has exactly 54 long-format criterion rows;
- each provider appears three times per chair in the wide file;
- each persona appears three times per chair across providers;
- each judgment has exactly six criterion rows;
- criterion order and naming are canonical;
- all assessed scores are integers 1–5;
- every non-assessed score is null;
- no duplicate keys exist;
- long and wide scores agree;
- image hashes match image_manifest.csv;
- persona versions match persona_manifest.csv;
- models/settings match provider_manifest.csv;
- no human ratings appear in prompts or outputs;
- no synthesizer or consensus score was produced.

Create validation_summary.json containing all checks and pass/fail values.

Do not label the package complete while a mandatory check fails.

---

## 19. Checkpointing and resumability

The experiment may require 552 provider calls.

Checkpoint after every completed chair.

A resumed run must:

- reuse the same experiment ID;
- reuse the same frozen versions and parameters;
- detect completed slots using full slot identity;
- not call completed slots again;
- not reuse a response for a different slot;
- preserve original attempt history;
- report every resume event.

Slot identity:

    experiment_id
    + design_index
    + provider
    + persona_id
    + pipeline_version
    + panel_version_id

Completed-response reuse is allowed only for resuming the exact same experiment and exact same slot after verifying the stored response hash. It must not be used across experiment IDs or changed persona/model/prompt versions.

---

## 20. Do not calculate the final statistics in Antigravity

Antigravity should validate structure and arithmetic only.

Do not ask Antigravity to conclude:

- whether AI agrees with the professional;
- whether AI can replace a professional;
- whether AI is useful as an aid;
- whether a criterion is statistically significant;
- whether ICC is good or bad;
- whether calibration succeeded;
- whether a provider is best.

The final statistical analysis will be performed separately using:

1. the untouched professional-human Excel workbook;
2. raw_cat_scores_long.csv;
3. raw_cat_scores_wide.csv;
4. manifests and failure information.

This separation reduces confirmation bias and ensures the analysis can be reproduced independently.

---

## 21. Planned final statistical analysis

After the output ZIP and the human Excel workbook are provided, the analysis will:

### Data integrity

- verify the 46-chair mapping;
- resolve Onda Chiar/Onda Chair against the workbook;
- verify Fingie/LikaLiku order;
- audit human-score cells;
- identify missing or duplicated rows;
- confirm that no scores were synthesized.

### AI panel construction

Calculate independently:

- persona-level results;
- provider-level results;
- nine-slot academic-panel mean by chair and criterion;
- panel median as a robustness check;
- composite only when scientifically justified.

The nine slots are repeated AI conditions, not nine independent chairs.

### Human–AI score agreement

Report:

- mean absolute error;
- mean signed bias;
- root mean squared error as supporting information;
- exact agreement;
- within-one-point agreement;
- criterion-specific results;
- chair-level results;
- simple constant-score baselines.

### Ranking agreement

Report:

- Spearman rank correlation;
- Kendall rank correlation where useful;
- appropriate tie handling;
- permutation-based uncertainty/testing where appropriate.

### Absolute agreement

Use a clearly specified absolute-agreement ICC where applicable and report:

- ICC model;
- definition;
- unit;
- single versus average measure;
- confidence interval.

ICC will not be treated as interchangeable with correlation.

### Uncertainty

Use chair-level resampling so all scores for a chair remain together.

The independent chair sample is:

    n = 46

Do not resample individual criterion rows as though they were independent chairs.

### Provider and persona effects

Explore:

- provider-specific error;
- persona-specific error;
- provider × persona interactions;
- score compression;
- criterion-specific systematic bias;
- visual abstention patterns.

Use models appropriate to repeated ordinal ratings and report descriptive effects even when inferential power is limited.

### Robustness

Include:

- leave-one-chair-out sensitivity;
- alternative mean/median aggregation;
- H-category 13-chair subset comparison;
- baseline comparisons;
- analysis with and without any incomplete chairs;
- no calibration evaluated on the same data used to fit it.

### Interpretation

Separate conclusions about:

- numerical agreement;
- ranking;
- repeatability;
- visual grounding;
- persona qualitative value;
- replacement;
- assistance.

An AI-assistance claim still requires a human-only versus human-with-AI study.

---

## 22. Stop conditions

Stop and ask the user when:

- the evidence-gated v3 system has not passed grounding controls;
- sample_images does not contain exactly one design_1 through design_46;
- the image mapping conflicts with the user-provided order;
- academic persona selection is ambiguous;
- panel/persona versions change;
- a provider model does not accept images;
- a provider model must be changed;
- the call budget is not approved;
- human ratings are accidentally included in provider context;
- execution would write into production;
- existing research data would be overwritten;
- mandatory validation cannot pass.

When stopping, state completed work and the single next action required.

---

## 23. Completion checklist

- [ ] Evidence-gated v3 regression suite passed.
- [ ] Exactly 46 images discovered.
- [ ] design_1 through design_46 mapping verified.
- [ ] design_9 confirmed as Fingie Chair.
- [ ] design_10 confirmed as LikaLiku Chair.
- [ ] Onda dataset spelling and normalized alias preserved.
- [ ] Three academic personas confirmed and frozen.
- [ ] OpenAI model/settings frozen.
- [ ] Anthropic model/settings frozen.
- [ ] xAI model/settings frozen.
- [ ] Assignment and rubric frozen.
- [ ] Human ratings excluded from all provider context.
- [ ] Planned call count and cost shown.
- [ ] User approved the run.
- [ ] 138 visual-evidence records produced.
- [ ] 414 Stage 2 slot records produced or represented with null placeholders.
- [ ] 2,484 long-format rows produced.
- [ ] 414 wide-format rows produced.
- [ ] No synthesizer invoked.
- [ ] No consensus or overall score generated.
- [ ] Failures and abstentions preserved.
- [ ] All completeness checks passed.
- [ ] ZIP package created.
- [ ] File hashes recorded in the experiment manifest.

---

## Final instruction to Antigravity

First verify that the evidence-gated v3 pipeline and its visual-grounding regression tests have passed. Then freeze the exact assignment, rubric, three academic personas, provider models, response schema and image mapping. Evaluate all 46 chairs blindly. Run one image-only evidence extraction per chair and provider, then use that provider-specific evidence for the three academic persona score calls. Do not invoke the synthesizer and do not calculate consensus scores. Return the complete 2,484-row raw CAT score table, the 414-row wide table, manifests, statuses and null-preserving failure records in the specified ZIP. Stop if any mandatory integrity check fails.
