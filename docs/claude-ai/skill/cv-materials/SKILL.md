---
name: cv-materials
description: Draft job-application material (cover letter bodies, pre-screening answers) for Lenin Cuadra, grounded in his CV profile and portfolio case studies. Use when asked for a cover letter, carta de presentación, screening answer, or respuesta de pre-screening for a job application.
---

# cv-materials

Replicates the AI pipeline of Lenin's cv-builder app: same grounding, same
voice, same output rules. Zero-cost sibling of the app's `/api/ai/*` routes.

## Grounding files (in this skill folder)

- `background.md` — Lenin's profile brief: identity, experience, skills,
  certifications, voice guidelines. The ONLY source of facts about Lenin —
  never invent employers, metrics, tools, or projects.
- `spec-cache.json` — portfolio focus profiles and case studies. When the
  request names a focus (`payments`, `ai`, `conversion`), pull that profile's
  `proofs` and the first 2–3 entries of its `order` from `cases` (in the
  request's language) and lean on them as the strongest evidence.

Read both files before drafting.

## Inputs to collect (ask if missing)

Company, role, language (EN, ES, or Ambos — cover letter only, produces both
clearly separated), and optionally: focus, contact name (`who`), posting
context (requirements pasted from the job ad).

## Voice

First person, confident, concise. Lead with outcomes and metrics, not
adjectives. Concrete verbs (built, led, redesigned, reduced). No filler, no
generic enthusiasm. Every draft gets human-edited before sending — bias
toward a strong, specific first pass over a safe, generic one.

## Task: cover letter

Write the BODY only (greeting through sign-off). Address `who` if given,
else a generic professional greeting (never "To Whom It May Concern").
Write in the requested language; if Ambos, produce both, clearly separated.
3–4 short paragraphs: why this role/company, one or two strongest relevant
proof points, brief close. Markdown only: paragraphs, line breaks, `- `
lists, **bold**, *italic*.

### Deliverable: assemble the actual .docx

Unlike the CV (real designed master + a tracking code checked against a
private registry, neither available here), the cover letter has no master
and no tracked links — just a programmatic letterhead + the body above.
Produce a real `.docx` (use code execution / file creation if this chat
supports it) instead of only returning plain text:

- **Page**: US Letter (8.5×11in), margins 0.75in all sides. Font: Arial.
- **Letterhead**, one paragraph each, in order:
  1. "Lenin Cuadra" — bold, 26pt, `#111827`.
  2. Subtitle — bold, 12pt, `#1A56DB`. EN: "Senior Product Designer  ·  AI
     Adoption Lead". ES: "Senior Product Designer  ·  Líder de Adopción de
     IA".
  3. Contact — 9pt, `#6B7280`. EN: "hi@lenincuadra.com  ·  +549
     351-376-6049". ES: "hola@lenincuadra.com  ·  +549 351-376-6049".
  4. Date — 10pt, `#374151`, long form in the letter's language ("July 16,
     2026" / "16 de julio de 2026"), today unless told otherwise, extra
     spacing before/after.
- **Body**: 10pt, `#374151`, ~1.15 line spacing, small paragraph spacing.
  `- ` lines → bullet points ("•  ", indented). **bold**/*italic* preserved.
- **Filename**: exactly `Lenin_Cuadra_Cover_Letter.docx`.

If file creation isn't available here, fall back to plain text — the user
pastes it into cbuilder's letter textarea, which renders the same markdown.

## Task: pre-screening answer

Answer in the question's language (not necessarily the language used to
describe company/role/focus). Plain text, no markdown, no greeting — as if
typed into an application form. As short as the question warrants.

## Rules

- Facts from the grounding files only; if information is missing (salary,
  visa status…), say so instead of inventing.
- No focus given → general profile, no case-study emphasis.
- Output ONLY the draft (plus a one-line note if something was missing).
