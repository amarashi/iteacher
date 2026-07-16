# The critique loop is conversational; the tutor never writes progress or files (v1)

## Status

accepted

## Context

We're adding hands-on practice: the learner produces an **Artifact**, submits it,
and the tutor **Critiques** it. The obvious expectation is that "the tutor says
your work is good" should advance the learner's mastery — i.e. the tutor grades,
and grading records progress. We deliberately chose not to do that in v1.

## Decision

A Critique is **conversational only**. The tutor perceives the artifact and gives
feedback in the chat; it does **not** write `progress.json` and does **not** write
learning-records or any other file. Progress continues to come solely from the
browser (the lesson's `iteacher:exercise` bridge and the learner's "Mark complete"),
exactly as before. The tutor stays strictly read-only (`Read, Glob, Grep, Skill`).

## Consequences

- The single-writer progress model is untouched — no agent→progress path — so the
  honest-progress principle (PRODUCT.md #4) can't be undermined by a wrong AI verdict.
- The tutor's read-only safety property ("can't clobber a lesson mid-flow") holds
  completely.
- The learner's *work* persists as a file under `./submissions/`; the *critique*
  itself lives only in the chat and is not durably captured in v1.
- Deferred, not rejected: tutor-advised grading where the learner confirms a
  pass (recorded via the existing browser bridge), and persisting notable critiques
  as learning-records, are clean follow-ons once the loop has been felt.
