## THE GATE® — Civic Engagement Platform (Rebuild)

A Nigeria-focused civic engagement search/review platform that routes citizen actions to the correct government body (Federal / Concurrent / Residual) using AI keyword analysis, with voice-note support.

### Core User Flow

1. **Landing** — Warm welcome: *"Hello, what do you want to do now?"* with 6 action cards:
   - Registration (National ID, Pensions, Voter's Card, NHIS…)
   - Request (Legal Aid, PCC, Scholarships Board…)
   - Enquiries (Info & access)
   - Reporting (EFCC, ICPC, SON…)
   - Application (JAMB, Licenses, Int'l Passport…)
   - Complaints

2. **Lightweight Onboarding** (no auth/signup — session-only):
   - Full name
   - Phone number
   - State & LGA of Origin
   - State & LGA of Residence
   Stored in `localStorage` for the session.

3. **Action Workspace** — based on selected action:
   - **Complaints / Enquiries / Request**: text box with live autocompletion + suggestions; voice-note button (mic → AI transcription via Lovable AI Gateway). On submit, AI analyzes keywords and returns a structured report:
     - Government level (Exclusive / Concurrent / Residual)
     - Responsible MDA(s)
     - Responsible officer (President / Governor / LG Chairman)
     - Suggested next steps & contact channels
   - **Reporting**: text + photo/video evidence upload → stored to Lovable Cloud + admin notified.
   - **Registration / Application**: lookup tool — type the service, get the responsible MDA, requirements, link to apply.

4. **Admin Inbox** (single admin route, password-protected via simple env passcode for now): list of submitted reports with media.

### Technical Plan

**Frontend (React + Tailwind + shadcn)**
- `/` — Landing (welcome + 6 action cards)
- `/start/:action` — Onboarding form (skipped if already in localStorage)
- `/workspace/:action` — Action-specific workspace
- `/admin` — Reports inbox (passcode gate)

**Data**
- Curated dataset `src/data/govResponsibilities.ts` listing common MDAs grouped by Exclusive / Concurrent / Residual lists with keywords for matching.
- Nigeria states + LGAs dataset (lightweight JSON).

**AI (Lovable AI Gateway, no API key needed)**
- Edge function `analyze-civic` — takes complaint/enquiry text, calls `google/gemini-3-flash-preview` with structured tool-call output → returns `{ level, mda, officer, rationale, nextSteps[] }`.
- Edge function `transcribe-voice` — accepts audio blob → uses Lovable AI multimodal (Gemini) to transcribe → returns text.

**Backend (Lovable Cloud)**
- Table `reports` (public insert, admin read): action_type, name, phone, origin_state, origin_lga, residence_state, residence_lga, content, evidence_urls, ai_analysis (jsonb), created_at.
- Storage bucket `report-evidence` (public read, public insert) for photos/videos.
- No authentication — submissions are open; admin reads via passcode-gated client query (RLS open read for now, or via service-role edge function).

### Design

Premium, clean, Nigerian-civic feel: deep navy + emerald accent, generous whitespace, large action tiles on landing, microphone pulse animation, results presented as a clear "verdict card" showing the responsible tier with visual hierarchy.

### Out of Scope (for v1)

- User accounts, profiles, learning hub, polls, volunteer, notifications, social features.
- Multi-admin roles, 2FA — single admin passcode only.

### Deliverables

1. Database migration: `reports` table + storage bucket + RLS.
2. Two edge functions: `analyze-civic`, `transcribe-voice`.
3. Curated MDA dataset + states/LGAs dataset.
4. Pages: Landing, Onboarding, Workspace (with sub-modes), Admin inbox.
5. Reusable components: ActionCard, VoiceRecorder, VerdictCard, EvidenceUploader.
