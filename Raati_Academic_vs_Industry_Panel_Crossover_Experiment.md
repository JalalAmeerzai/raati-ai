# Raati Academic-versus-Industry Panel Crossover Experiment

## Execution specification for Antigravity

This experiment replaces the earlier general cache/routing investigation for the specific unresolved question:

> When the chair image, assignment, provider, model, CAT rubric and generation settings remain fixed, does replacing an academic/professor persona panel with a furniture-industry persona panel produce a meaningful change beyond ordinary repeat variation?

The concern is not that every score is always identical. The observed pattern is that approximately 99% of the numerical results remain the same, while the changes that do occur are minute. This experiment must determine whether that pattern represents:

1. stable and honest agreement under a shared CAT rubric;
2. a persona panel whose effect exists mainly in evidence and feedback rather than scores;
3. a persona layer with negligible functional influence;
4. ordinary model noise being mistaken for a persona effect;
5. aggregation or rounding hiding raw differences;
6. a remaining panel-version, persistence, or display defect;
7. visually ungrounded scoring dominated by assignment text.

Do not force different scores. Measure whether persona-panel substitution causes a grounded effect larger than repeat noise.

---

## 1. What the previous diagnostic established

Use the attached previous FINAL_DIAGNOSIS.md as baseline evidence, not as the final answer to this experiment.

It reported:

- 38 genuine provider calls;
- correct persona canaries;
- distinct outbound persona requests;
- no exact raw-response duplication;
- correct image routing and slot persistence;
- qualitatively different persona-lens prose;
- strong convergence at the final 1–5 integer-score level;
- a critical visual-grounding failure from OpenAI on a blank image;
- OpenAI and Anthropic testing, but not a complete xAI replication.

Therefore, do not rerun a generic cache investigation unless the new crossover trace contradicts those findings.

The previous diagnostic did not directly establish whether replacing one complete three-person academic panel with one complete three-person industry panel changes results more than repeating the same panel. That is the purpose of this experiment.

### Important fingerprint correction

Maintain two different identities:

1. Execution identity: unique for every outbound provider call.
2. Semantic request fingerprint: derived only from behavior-changing inputs.

Repeated calls with identical semantic inputs should have:

- different execution IDs and provider request IDs;
- the same semantic fingerprint.

Academic and industry conditions should have:

- different semantic fingerprints because their persona content differs.

Do not classify 100% unique semantic fingerprints across semantically identical repeats as a success. That usually means run IDs, timestamps, nonces or request IDs were incorrectly included in the hash.

---

## 2. Fixed research assignment

Use this text verbatim for every condition:

> Design an Easy Chair for the Design Center FSRD ITB, a space used for academic and non-academic activities such as guest lectures, seminars, workshops, sharing sessions, and meetings. The chair will primarily be used by speakers, guest speakers, and moderators, although it may also be used by students, lecturers, guests, and other visitors when no event is taking place. The intended users range approximately from 18 to 65 years old, and the chair should be suitable for sitting periods of around 1–3 hours. Your design should respond to the different ways people may sit during these activities. Users may sit upright or lean back, lean forward while taking notes, rest one or both arms on the armrests, hold a microphone, book, or laptop, cross one leg over the other, or sit with their legs positioned more widely. The chair should therefore provide a comfortable backrest for extended use, supportive armrests, and sufficient seat width to accommodate different sitting positions comfortably. Develop an Easy Chair solution that balances these functional and user needs with a clear and thoughtful design concept.

Store the exact UTF-8 text and assignment_sha256 in the manifest. Do not paraphrase it between conditions.

---

## 3. Image directory and canonical mapping

Read images from:

    <repository-root>/sample_images/

Supported extensions:

    .png
    .jpg
    .jpeg
    .webp

Sort by numeric suffix, not lexicographically. design_2 must precede design_10.

Use this fixed mapping:

| Image basename | Canonical chair name |
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

For every image record:

- exact source filename;
- basename;
- numeric design index;
- canonical chair name;
- SHA-256;
- byte length;
- MIME type;
- pixel width and height;
- color mode when available.

Do not infer names from pixels. Stop if a selected design is missing or if two files share the same design basename with different extensions. Ask the user which is authoritative.

If sample_images is missing or empty, stop and ask the user to place the images there.

---

## 4. Panel definitions

The experiment requires two separately versioned panels.

### Panel A: academic panel

Exactly three currently configured personas whose primary professional identity is academic, professor, education, cognitive studies, creativity research, design research or an equivalent scholarly role.

### Panel B: industry panel

Exactly three currently configured personas whose primary professional identity is practicing furniture design, furniture production, industrial/product design practice, manufacturing, prototyping, ergonomics practice or an equivalent industry role.

Do not generate replacement personas during the experiment. Use the profiles the user actually selected in the application.

Before provider calls, produce a panel-confirmation table:

| Panel | Slot | Persona ID | Persona name | Persona version | Profile hash | Primary expertise |
|---|---:|---|---|---|---|---|
| A | 1 |  |  |  |  |  |
| A | 2 |  |  |  |  |  |
| A | 3 |  |  |  |  |  |
| B | 1 |  |  |  |  |  |
| B | 2 |  |  |  |  |  |
| B | 3 |  |  |  |  |  |

Also record:

- academic panel_version_id;
- industry panel_version_id;
- assignment_version_id;
- rubric_version;
- prompt-template version.

The two panels must have different panel IDs and profile hashes. If either panel is mixed, incomplete, ambiguous, or points to the same profile versions, stop and ask the user to confirm the intended six profiles.

Do not pair academic persona 1 with industry persona 1 as though they were the same rater. They are different panel members. Compare panel distributions and panel means.

---

## 5. Providers and model settings

Use all three providers because the user observed the pattern in all three:

- OpenAI;
- Anthropic;
- xAI.

Record the exact runtime model identifier returned or confirmed by each provider.

Hold constant across Panel A and Panel B:

- model identifier;
- temperature;
- top_p when supported;
- seed when supported;
- image detail/resolution setting;
- maximum output tokens;
- response schema;
- system rubric;
- assignment;
- submission description;
- retry policy.

Use fresh, stateless provider calls. Do not share conversational history between conditions.

Do not increase temperature to manufacture panel differences. The primary experiment should use the application's normal production research settings.

---

## 6. Non-negotiable safeguards

1. Use a development or research environment, not production.
2. Preserve all existing research data.
3. Do not alter persona text, CAT anchors, aggregation or prompts after seeing baseline results.
4. Do not use a completed-response cache.
5. Provider prompt-prefix caching may remain enabled because it does not replay completed answers.
6. Do not count retries as independent observations.
7. Do not count three personas from one model as three independent human professionals.
8. Do not count 54 criterion scores from one chair as sample size 54. The independent design unit remains the chair.
9. Store raw scores before rounding or aggregation.
10. Store raw provider responses separately from validated and displayed results.
11. Do not infer that equal scores are dishonest without evaluating evidence, repeat noise and external validity.
12. Do not call different scores a success unless they are supported by relevant visible evidence.
13. Do not expose API keys or sensitive headers.
14. Use the same code revision throughout one experimental phase.
15. If a technical defect is found, stop, preserve the failed baseline, fix it, version the code, and rerun the entire affected phase.

---

## 7. Required response structure

Preserve the existing six CAT criteria:

- Creativity;
- Originality;
- Usefulness/Relevance;
- Clarity;
- Level of Detail/Elaboration;
- Feasibility.

Keep the production integer 1–5 scores.

For the experiment, additionally require each persona response to contain:

    persona_id
    persona_version
    panel_id
    panel_version
    persona_canary
    primary_professional_lens
    visible_evidence_items
    criterion_explanations
    uncertainties
    recommendations

Each visible evidence item should include:

    observed_feature
    visible_or_supplied_basis
    professional_interpretation
    relevant_CAT_criteria
    confidence

The model must distinguish visible evidence from unknown properties. Hidden joinery, exact dimensions, comfort, material identity, cost and manufacturing processes must not be stated as fact unless supplied or genuinely visible.

Canaries prove routing only. Remove persona IDs, canaries and template boilerplate before content-similarity analysis.

---

## 8. Experimental design overview

Use a staged design to limit unnecessary provider cost.

### Phase 0: preflight without provider calls

Complete:

- repository and active endpoint identification;
- confirmation of Panel A and Panel B;
- panel/profile version verification;
- exact assignment hash;
- image inventory and hashes;
- runtime model and parameter capture;
- semantic-fingerprint implementation;
- execution-ID implementation;
- database and frontend trace verification;
- call-count calculation.

Produce a dry-run manifest and the compiled, redacted requests for user inspection.

### Phase 1: one-chair all-provider crossover

Use:

    design_1 — Tumpuan Chair

Run this balanced sequence:

    A1 → B1 → B2 → A2

Each panel evaluation contains:

    3 persona profiles × 3 providers = 9 provider calls

Phase 1 total:

    4 panel evaluations × 9 calls = 36 provider calls

Purpose:

- verify complete panel switching;
- estimate within-panel repeat variation;
- estimate between-panel effect;
- include all three providers;
- identify aggregation/rounding problems;
- decide whether broader testing is justified.

Stop after Phase 1 and generate an interim report before spending on more chairs.

### Phase 2: three-chair crossover replication

Run only if Phase 1 passes technically and the user approves additional calls.

Use:

- design_1 — Tumpuan Chair;
- design_7 — Para Chair;
- design_13 — Lipat Chair.

Use balanced sequences:

    design_1:  A → B → B → A
    design_7:  B → A → A → B
    design_13: A → B → B → A

Phase 2 cumulative total:

    3 chairs × 4 evaluations × 9 calls = 108 provider calls

If Phase 1 has already been completed without code/prompt changes, reuse those 36 calls for design_1. Do not rerun them unnecessarily.

Purpose:

- establish whether results generalize beyond one chair;
- compare persona-panel signal with repeat noise;
- detect provider-specific behaviour;
- inspect whether the panel effect depends on chair characteristics.

### Phase 3: full 13-chair panel study

Run only after successful Phases 1 and 2 and explicit user approval.

For every chair, obtain at least one Panel A and one Panel B evaluation.

Balance order:

    odd design number:  A → B
    even design number: B → A

For the three Phase 2 chairs, use the first valid occurrence of A and B as their primary full-study observations. Their second occurrences estimate repeatability.

The remaining ten chairs require:

    10 chairs × 2 panels × 9 calls = 180 additional calls

Cumulative total with Phase 2:

    108 + 180 = 288 provider calls

Do not exceed the approved stage or call cap. Print planned calls and expected cost, when provider pricing is available, before each phase.

---

## 9. Call isolation and provenance

For every provider attempt store:

    experiment_id
    phase
    chair_index
    chair_name
    image_sha256
    sequence_position
    condition_id
    panel_type
    panel_version_id
    persona_id
    persona_version
    persona_profile_sha256
    provider
    requested_model
    returned_model
    execution_call_id
    provider_request_or_response_id
    semantic_request_sha256
    raw_response_sha256
    validated_response_sha256
    persisted_response_sha256
    API_response_sha256
    temperature
    top_p
    seed
    input_tokens
    output_tokens
    cached_input_tokens_when_available
    attempt_number
    is_retry
    started_at
    completed_at
    status
    error

### Execution identity

Generate a unique execution_call_id for every genuine outbound request.

Every Phase 1 call should have a distinct execution ID. Provider request/response IDs should also be distinct when exposed.

### Semantic request fingerprint

Hash canonical JSON containing only behavior-changing inputs:

    provider
    exact model
    shared system prompt
    complete persona profile
    persona version
    CAT rubric/version
    assignment text
    submission description
    image SHA-256
    response schema
    generation parameters
    image detail setting

Exclude:

    run_id
    attempt_id
    execution_call_id
    timestamps
    random nonce
    trace headers
    provider request ID

Expected Phase 1 behaviour:

- A1 and A2 corresponding slots have the same semantic fingerprint.
- B1 and B2 corresponding slots have the same semantic fingerprint.
- A and B slots have different semantic fingerprints because their profiles differ.
- All 36 execution IDs are unique.

If these expectations fail, stop before interpreting scores.

---

## 10. Preserve the complete score hierarchy

For every panel evaluation, save all 54 raw criterion scores:

    3 providers × 3 personas × 6 criteria = 54 scores

Store one row per:

    chair
    panel
    repetition
    provider
    persona
    criterion

Then calculate separately:

1. persona-level six-score vector;
2. provider-panel criterion mean across three personas;
3. provider-panel six-dimensional mean vector;
4. nine-evaluator panel criterion mean;
5. overall six-criterion composite before rounding;
6. final displayed value after rounding.

Never use only the displayed score such as 3.8 to determine equality.

If two displayed results are equal but their raw score matrices differ, classify this as aggregation/rounding convergence—not identical evaluation.

---

## 11. Primary quantitative measures

### 11.1 Raw score equality

Report:

- exact persona-vector equality where a meaningful comparison is defined;
- per-criterion equality;
- equality of the sorted three-persona score multiset within each provider and criterion;
- exact provider-panel mean-vector equality;
- exact nine-evaluator panel mean-vector equality;
- final rounded-composite equality.

Because Panel A and Panel B contain different people/profiles, do not imply one-to-one rater pairing between them.

### 11.2 Within-panel repeat distance

For each provider and criterion:

    A_repeat_distance = absolute(A1 panel mean - A2 panel mean)
    B_repeat_distance = absolute(B1 panel mean - B2 panel mean)

Define:

    D_within = mean(A_repeat_distance, B_repeat_distance)

Calculate the equivalent distance for six-dimensional score vectors and the final unrounded composite.

### 11.3 Between-panel distance

First average the repeated estimates within each panel:

    A_bar = mean(A1, A2)
    B_bar = mean(B1, B2)

Then:

    D_between = absolute(A_bar - B_bar)

Also retain the signed effect:

    signed_panel_effect = B_bar - A_bar

### 11.4 Persona effect beyond noise

Calculate:

    excess_panel_effect = D_between - D_within

Interpretation:

- positive and materially large: panel substitution exceeds repeat noise;
- approximately zero: panel change is no larger than ordinary repetition;
- negative: repeat instability exceeds the observed panel effect.

A signal-to-noise ratio may be reported:

    panel_effect_ratio = D_between / D_within

When D_within is zero, report the numerator directly and mark the ratio as undefined or infinite. Do not hide zero denominators with an arbitrary constant in the primary result.

### 11.5 Change rates

Report:

    criterion_score_change_rate
    provider_panel_vector_change_rate
    raw_matrix_change_rate
    unrounded_composite_change_rate
    rounded_display_change_rate

The user's observed 99%-same claim should be translated into these explicit rates.

---

## 12. Qualitative persona-effect measures

Score equality does not establish that personas are ineffective. Compare:

- visible features selected;
- professional interpretation;
- uncertainty statements;
- recommendations;
- criterion explanations.

Remove before similarity analysis:

- persona names;
- persona IDs;
- canaries;
- panel labels;
- repeated rubric text;
- schema field names;
- identical assignment quotations.

Calculate:

- exact normalized-text duplication;
- token Jaccard similarity;
- SequenceMatcher similarity;
- evidence-category overlap;
- recommendation-category overlap;
- uncertainty-category overlap.

Create an evidence coding table with at least these domains:

| Domain | Typical relevance |
|---|---|
| Conceptual novelty and expectation | Academic/creativity |
| Design theory or creative coherence | Academic/creativity |
| Pedagogical/process interpretation | Academic |
| Structure and load path | Industry/furniture |
| Joint and component transition | Industry/furniture |
| Materials and manufacture | Industry/furniture |
| Prototyping and production readiness | Industry/furniture |
| Posture and prolonged use | HCD/ergonomics |
| Access, inclusion and interaction | HCD |
| Visible-detail limitation | All responsible evaluators |

Do not score lens compliance using the evaluated model as the only judge. Use transparent rules followed by blinded manual review.

### Blinded review

Create anonymized response IDs. Remove provider, panel and persona labels. Ask at least one reviewer to classify each response as:

- more consistent with academic analysis;
- more consistent with industry analysis;
- mixed;
- indistinguishable.

Report classification accuracy and uncertainty. If reviewers cannot distinguish the conditions above chance-like performance, the persona-panel effect is likely superficial.

Do not claim a formal chance test unless the review design and sample size support it.

---

## 13. Visual-grounding audit

The previous diagnostic found that OpenAI assigned plausible chair scores and invented features for a solid-grey image. Treat visual grounding as a separate validity dimension.

For each real-chair response flag:

- evidence clearly visible;
- evidence plausibly inferred but uncertain;
- unsupported hidden-property assertion;
- feature apparently copied from assignment rather than image;
- contradiction with pixels;
- inability to assess appropriately stated.

Do not rerun the grey control in every phase if code and prompts remain unchanged. Rerun it once per provider after any change intended to improve grounding.

A system can be technically independent and persona-sensitive while still being invalid because it hallucinates visual evidence.

The final conclusion must report persona influence and visual grounding separately.

---

## 14. Optional causal controls

Run these only if the primary crossover is technically valid but Panel A and Panel B remain nearly indistinguishable.

### 14.1 No-persona baseline

For design_1, run a generic CAT evaluator with no professional profile using each provider. Use the identical rubric, image and settings.

Purpose:

- determine whether both panels reproduce the provider's generic baseline;
- quantify whether either panel adds anything beyond the base evaluator.

Do not combine the no-persona condition into the three-person panel average as though it were another rater.

### 14.2 Content-versus-label swap

Use one academic profile and one industry profile. Create four diagnostic conditions:

| Condition | Displayed role title | Detailed profile content |
|---|---|---|
| AA | Academic | Academic |
| II | Industry | Industry |
| AI | Academic | Industry |
| IA | Industry | Academic |

Keep unique diagnostic canaries.

Run all four conditions for design_1 across the three providers:

    4 conditions × 3 providers = 12 calls

Purpose:

- if behaviour follows detailed content, the operational profile matters;
- if behaviour follows only the title, role labels dominate superficially;
- if neither changes behaviour, the shared rubric/model dominates;
- if results fluctuate without corresponding evidence, noise dominates.

Do not include swap-test results in the primary CAT panel dataset.

---

## 15. Statistical analysis for Phase 3

The independent design sample is 13 chairs, not 54 scores per chair.

### Primary descriptive results

For each provider and CAT criterion report:

- Panel A mean and median;
- Panel B mean and median;
- signed paired mean difference;
- paired median difference;
- mean absolute panel difference;
- score equality rate;
- chair-level plots/tables;
- within-panel repeat distance from anchor chairs;
- excess panel effect over repeat distance.

Also report nine-evaluator panel summaries, while retaining provider-specific results.

### Chair-level uncertainty

Use chair-level resampling. Resample chairs as complete blocks so all provider, panel, persona and criterion observations for a chair remain together.

With only 13 chairs, label bootstrap intervals exploratory and show raw chair-level values.

### Exact paired permutation

For each provider/criterion, use a paired panel-label permutation across chairs when its assumptions match the design. With 13 paired chairs, all 2^13 label swaps can be enumerated.

Report:

- observed signed difference;
- exact two-sided permutation p-value;
- effect magnitude;
- Holm-adjusted p-values within the predefined family of six criteria for each provider.

Do not interpret non-significance as proof of no effect. The pilot is small and scores are coarse.

### Global interpretation

Do not rely on p-values alone. The key causal comparison is whether between-panel change is materially larger than within-panel repeat noise and whether it corresponds to professionally appropriate evidence.

Do not use ICC among AI personas as proof that persona substitution works. ICC answers agreement, not causal persona influence.

Do not inflate the sample size by treating providers, personas, criteria or repetitions as independent chairs.

---

## 16. Predefined decision framework

The word honest should be operationalized as technical integrity, causal responsiveness, evidence grounding and external agreement.

### Outcome 1: technically valid and persona-sensitive

Requirements:

- correct panels and canaries;
- genuine new provider calls;
- A/B semantic fingerprints differ;
- A repeats and B repeats behave consistently;
- between-panel evidence differences exceed within-panel differences;
- score differences, if present, are grounded in relevant evidence.

Conclusion:

The panel substitution produces a measurable professional-lens effect.

### Outcome 2: technically valid, qualitatively sensitive, numerically convergent

Pattern:

- evidence, uncertainties and recommendations differ meaningfully;
- numerical CAT effects are at or below score-boundary resolution;
- repeatability is good;
- raw responses are not reused.

Conclusion:

Personas add qualitative coverage but should not be presented as independent numerical raters. Their value is assistance and explanation.

### Outcome 3: stable but persona-insensitive

Pattern:

- A and B results are nearly identical;
- differences are no larger than within-panel repeat variation;
- blinded reviewers cannot distinguish academic from industry outputs;
- both resemble the no-persona baseline.

Conclusion:

The persona layer is functionally weak. Do not count persona slots as additional professional raters. Consider a two-stage evidence architecture or simplify to provider-level evaluators.

### Outcome 4: unstable and noise-dominated

Pattern:

- A1 versus A2 and B1 versus B2 differences are as large as or larger than A versus B;
- changes do not correspond to professional evidence;
- results vary across repetition without a coherent lens.

Conclusion:

Persona effects cannot be trusted. Improve deterministic controls and evidence constraints before further claims.

### Outcome 5: technical pipeline defect

Pattern:

- wrong panel/profile version;
- incorrect canary;
- missing provider calls;
- response mapped to wrong slot;
- different raw scores collapsed later;
- stale UI or rounded value presented as the only result.

Conclusion:

Preserve the failed run, fix the defect, add regression coverage and rerun the phase.

### Outcome 6: visually ungrounded

Pattern:

- scores rely on assignment wording rather than visible chair evidence;
- unsupported features are asserted;
- blank/ambiguous images receive confident furniture descriptions.

Conclusion:

The score may be reproducible but is not sufficiently valid. Visual-grounding remediation is required independently of persona work.

More than one outcome can apply. Identify the first pipeline stage where convergence appears.

---

## 17. Two-stage architecture decision

Do not implement this before measuring the current system.

If Outcome 3 occurs, propose—but do not automatically merge—a two-stage condition:

### Stage 1: persona-specific evidence extraction

Academic panel extracts:

- conceptual novelty;
- formal expectations and departures;
- creative coherence;
- design-process or pedagogical interpretation;
- uncertainties.

Industry panel extracts:

- structure and load relationships;
- joints and component transitions;
- material/manufacturing plausibility;
- ergonomics and use duration;
- prototyping/production readiness;
- uncertainties.

No CAT scores in Stage 1.

### Stage 2: shared CAT scoring

The scorer receives:

- original image;
- fixed assignment;
- one persona's evidence;
- shared CAT rubric.

Then it generates scores.

Rerun the crossover and compare current versus two-stage behaviour. Success means better evidence differentiation and grounding, not artificially greater score disagreement.

---

## 18. Human external-validity follow-up

Technical honesty does not establish professional validity.

For the journal study, obtain blind ratings from actual professionals representing both panel types:

- academic design/creativity professional;
- practicing furniture designer or furniture-industry professional;
- ideally an additional HCD/ergonomics professional.

Use the same 13 chairs, assignment and CAT rubric.

Test whether:

- Academic AI conditions align more closely with academic human ratings or evidence.
- Industry AI conditions align more closely with industry human ratings or evidence.
- AI disagreement flags cases where humans also disagree.
- AI feedback adds useful evidence or saves time in a human-with-AI workflow.

Do not claim that persona prompting creates independent professional experts without this external validation.

---

## 19. Required artifacts

Create a timestamped directory:

    diagnostics/panel_crossover/<UTC_TIMESTAMP>/

Required outputs:

    README.md
    preregistration.md
    manifest.json
    panel_profile_manifest.csv
    image_manifest.csv
    provider_attempts.jsonl
    redacted_requests/
    raw_responses/
    validated_responses/
    raw_scores_long.csv
    provider_panel_summary.csv
    aggregate_rounding_trace.csv
    repeatability_vs_panel_effect.csv
    score_equality_results.csv
    content_similarity.csv
    evidence_coding.csv
    visual_grounding_flags.csv
    statistical_results.csv
    failures.jsonl
    INTERIM_PHASE_1_REPORT.md
    FINAL_PANEL_CROSSOVER_REPORT.md

### raw_scores_long.csv required columns

    experiment_id
    phase
    chair_index
    chair_name
    image_sha256
    sequence_position
    panel_type
    panel_version_id
    repetition
    provider
    model
    persona_id
    persona_version
    criterion
    raw_integer_score
    execution_call_id
    provider_request_or_response_id
    semantic_request_sha256
    raw_response_sha256

### aggregate_rounding_trace.csv

Show every transformation from the 54 raw scores to:

- persona composite;
- provider-panel criterion mean;
- provider-panel composite;
- full-panel criterion mean;
- full-panel composite before rounding;
- displayed rounded value.

This file must make it possible to explain how two different raw matrices can produce the same displayed average.

---

## 20. Interim and final reporting requirements

### Phase 1 interim report

Answer:

1. Were all 36 calls genuine and correctly routed?
2. Did Panel A and Panel B use different versions and semantic inputs?
3. Did equivalent repetitions share semantic fingerprints?
4. Were raw matrices identical or only final averages?
5. What was D_within for each provider and criterion?
6. What was D_between?
7. Did between-panel effects exceed repeat noise?
8. Were qualitative differences professionally appropriate?
9. Could blinded reviewers distinguish panel type?
10. Did any provider show unsupported visual claims?
11. Should Phase 2 proceed?

### Final report

Include:

1. Plain-English conclusion.
2. Reproduction rate of the user's 99%-same observation.
3. Exact definition used for same.
4. Technical trace results.
5. Raw-score equality results.
6. Rounded-versus-unrounded comparison.
7. Within-panel repeatability.
8. Between-panel effect.
9. Persona effect beyond noise.
10. Provider-specific differences.
11. Evidence and blinded-review results.
12. Visual-grounding results.
13. Statistical results with uncertainty.
14. Root-cause/outcome classification.
15. Whether personas should be treated as scorers, explanation lenses, or removed.
16. Whether existing study conclusions require revision.
17. Whether two-stage evaluation should be tested.
18. Human-validation recommendations.
19. Complete limitations.

Do not write legitimate convergence merely because calls were independent. That conclusion requires showing that convergence is stable, grounded, professionally coherent and not merely caused by rubric dominance or rounding.

---

## 21. Automated tests

Add or retain regression tests for:

1. Academic and industry panels resolve to different panel versions.
2. Panel selections reach the provider payload.
3. Correct persona canary per slot.
4. Different panels generate different semantic fingerprints.
5. Identical semantic repeats generate identical semantic fingerprints.
6. All executions generate unique execution IDs.
7. Run-specific metadata is excluded from semantic fingerprints.
8. Image hashes match dispatched bytes.
9. Each response stays bound to run_id plus slot_id.
10. Raw scores survive validation and persistence unchanged.
11. Aggregation can be reconstructed from raw scores.
12. UI displays the selected run and panel, not stale results.
13. Retries are not counted as repetitions.
14. Provider failures do not silently reuse earlier judgments.
15. All provider calls are stateless.
16. Score criterion ordering is fixed.
17. Rounding occurs only at the presentation layer.

Mocks may be used for regression tests, but the crossover experiment itself must use genuine provider calls.

---

## 22. Stop conditions

Stop and request user input when:

- sample_images is absent or incomplete for the requested phase;
- either panel's three profiles cannot be resolved unambiguously;
- Panel A and Panel B reference the same versions;
- xAI, Anthropic or OpenAI credentials are unavailable;
- only production is available;
- the phase would exceed its approved call cap;
- the code/prompt/model changes during a phase;
- a technical trace fails;
- completing the run would overwrite earlier evidence;
- the planned API expense exceeds the user's configured limit.

When stopping, report completed work and the one next action required.

---

## 23. Completion checklist

- [ ] Previous diagnosis read and preserved.
- [ ] Exact assignment hashed.
- [ ] Images mapped and hashed.
- [ ] Academic panel confirmed.
- [ ] Industry panel confirmed.
- [ ] Panel/profile versions frozen.
- [ ] OpenAI model and settings frozen.
- [ ] Anthropic model and settings frozen.
- [ ] xAI model and settings frozen.
- [ ] Execution IDs implemented.
- [ ] Semantic fingerprints corrected and tested.
- [ ] Aggregation/rounding trace implemented.
- [ ] Phase 1 36-call crossover completed.
- [ ] Phase 1 interim report delivered.
- [ ] User approval obtained before Phase 2.
- [ ] Phase 2 balanced three-chair crossover completed if approved.
- [ ] User approval obtained before Phase 3.
- [ ] Full 13-chair study completed if approved.
- [ ] Raw and rounded equality separately reported.
- [ ] Within-panel noise calculated.
- [ ] Between-panel effect calculated.
- [ ] Qualitative evidence analysed.
- [ ] Blinded response classification completed.
- [ ] Visual-grounding limitations reported.
- [ ] Statistical analysis uses chair-level independence.
- [ ] Final outcome classified without forcing disagreement.
- [ ] Existing research-data implications stated.

---

## Final instruction to Antigravity

Do not begin by rewriting persona prompts. First preregister and run the Phase 1 A–B–B–A crossover for Tumpuan Chair using the two frozen panels and all three providers. Preserve all 54 raw scores per panel evaluation, distinguish semantic fingerprints from unique execution IDs, and trace every number through aggregation and rounding. The decisive quantity is not whether any score changes; it is whether the between-panel change is larger and more professionally coherent than repeating the same panel. Stop after the 36-call Phase 1 report and ask for approval before expanding to more chairs.
