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

Company, role, language (EN/ES), and optionally: focus, contact name (`who`),
posting context (requirements pasted from the job ad).

## Voice

First person, confident, concise. Lead with outcomes and metrics, not
adjectives. Concrete verbs (built, led, redesigned, reduced). No filler, no
generic enthusiasm. Every draft gets human-edited before sending — bias
toward a strong, specific first pass over a safe, generic one.

## Task: cover letter

Write the BODY only (greeting through sign-off — the app adds the
letterhead). Address `who` if given, else a generic professional greeting
(never "To Whom It May Concern"). 3–4 short paragraphs: why this
role/company, one or two strongest relevant proof points, brief close.
Markdown only: paragraphs, line breaks, `- ` lists, **bold**, *italic*.

## Task: pre-screening answer

Answer in the question's language. Plain text, no markdown, no greeting — as
if typed into an application form. As short as the question warrants.

## Rules

- Facts from the grounding files only; if information is missing (salary,
  visa status…), say so instead of inventing.
- No focus given → general profile, no case-study emphasis.
- Output ONLY the draft (plus a one-line note if something was missing).
