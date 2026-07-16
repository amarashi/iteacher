# iTeacher

The glossary for iTeacher — a local viewer + runtime that turns a root folder of
agent-authored `teach` workspaces into one running learning environment. Terms
here are the shared language for the app, the `teach` authoring method, and the
learner's experience.

## Language

### Learning surfaces

**Topic**:
One subject the learner is learning, backed by one workspace folder containing a
`MISSION.md`. The dashboard shows one card per topic.
_Avoid_: course (use only for the visual identity/accent), subject, folder.

**Lesson**:
A single self-contained HTML file teaching one tightly-scoped thing, served by
the app in an iframe with an injected progress bridge. The primary unit of teaching.

**Tutor**:
The AI teacher docked beside a lesson — a headless `claude` agent session running
in the topic's folder, read-only, one per topic. It answers and (newly) perceives
and critiques the learner's work.
_Avoid_: assistant, bot, chatbot.

### The Critique Loop *(new — under design)*

The hands-on practice mechanism: the learner **produces** something, **submits**
it, the tutor **perceives and critiques** it, and that counts as **progress**.
One general loop — not per-environment integrations. The production environment
(a coding sandbox, a drawing canvas, an external tool like Colab) is secondary
and mostly not hosted by the app.

**Artifact**:
The learner's **own work**, produced in response to a lesson and submitted for
critique — e.g. a code file, an image of a sketch, a written passage. Originates
from a **lesson** (tied to a `data-exercise-id`) and **can record progress**. The
unit that flows from learner to tutor.
_Avoid_: submission (that's the act), upload, attachment, work.

**Exhibit**:
**External** material the learner shows the tutor to ask about — a problem they're
stuck on, a diagram, a photographed question. Originates from the **chat composer**,
is not the learner's own work, and **records no progress**. Same file-in-workspace
mechanism as an Artifact; different intent, origin, and progress semantics.
_Avoid_: reference (means the `./reference/*.html` cheat-sheets — a collision),
query image, upload.

**Brief**:
The task a practice **lesson** poses plus the one or two things it assesses —
e.g. "sketch a cube in two-point perspective; we're checking your vanishing
points line up." Authored per critique-able lesson and handed to the tutor with
the artifact so the **Critique** is grounded and consistent. Not a full rubric.
_Avoid_: rubric (heavier than intended), prompt, assignment spec.

**Critique**:
The tutor's feedback on a submitted **Artifact**, measured against the lesson's
**Brief** and grounded in what the learner is actually learning. (Helping with an
Exhibit is not a critique — it's ordinary tutoring.)
_Avoid_: review, grade, feedback (too generic), correction.

**Practice lesson**:
A lesson that poses a **Brief** and offers a submit affordance, so the learner
produces an **Artifact** and gets a **Critique**. Contrast with a read/quiz
lesson, which teaches and self-checks in-browser without submitting anything.
_Avoid_: exercise (means a `data-exercise-id` unit), assignment, homework.

**Perceptual reach** *(constraint, not a UI term)*:
What the tutor can take in about an artifact. It can read text and code and *see*
images (via the `Read` tool); it **cannot hear audio** or feel real-time timing.
This bounds v1 artifacts to **text, code, and images** — audio/performance is out.
