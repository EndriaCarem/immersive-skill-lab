<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Real learner activities use versioned Cloud learning_programs content, account-owned submissions/notes and private Storage files; authenticated RLS checks active commerce enrollment and admin grading. The local content editor and demo learner store remain isolated and must never populate real learner records.
- Public browsing has no pre-launch request or navigation gate; legacy restricted-access links redirect to a sanitized same-site destination, while customer authentication and administrator authorization remain independent and enforced.
- Commercial writes use validated authenticated server functions and atomic database operations; prices, coupons, consent and entitlements are server-authoritative.
- Privileged roles live separately from editable profiles; administrative routes are client-only protected children with server-validated role checks.
- Administrative navigation uses an account-scoped role RPC query and stays hidden until verified; navigation visibility never replaces route or server authorization.
- Payment and email adapters stay inactive until authorized; missing credentials never create paid orders or sent-email claims.
- Mercado Pago uses server-only Checkout Transparente (card tokenized by the MP Brick; amount from the order). Only live-mode attempts (production MERCADO_PAGO_ACCESS_TOKEN) update orders/enrollments via service-only apply_commerce_payment; signed callbacks reconcile against the provider API.
- Published terms are immutable versions; changes create a new version so past acceptances stay auditable.
- Visual styles are ported from the uploaded mockup as plain CSS classes in src/styles.css; reuse those classes so screens stay faithful to the mockup.
- Marketing pages use SiteShell (floating nav, footer, shared responsive/mobile navigation); app screens use AppShell, which wraps SiteShell in a rounded frame, so navigation stays identical everywhere.
- The sign-in route uses a dedicated unframed account-entry layout rather than SiteShell so the form remains focused and follows the approved reference; authentication behavior is shared unchanged.
- Uploaded files (covers, attachments) are stored as blobs in IndexedDB via src/lib/files.ts and referenced by id from the store; rich text is saved as HTML in *Html fields and always rendered through the sanitizing Rich component.
- Brand manual v2 overrides live at the end of src/styles.css (flat buttons, 1px borders, signal colors, Newsreader via .doc-voice/.rich); the review-mark visual is the shared ReviewWindow component for marketing pages only, because its sample marks and scores must never appear as a learner's real evaluation.
- Interest and contact forms share InterestForm and a Zod schema; public write-only server actions store private submissions in Lovable Cloud, never in the unprotected local admin panel.
- Founder identity and portrait references are centralized in src/lib/founders.ts so profile cards and compact avatars use the same mapping.
- Classify authentication failures by provider code or known message in src/lib/auth-errors.ts, never HTTP status alone, so different validation failures are not misreported.
- Signup without a session navigates to the public /confirmar-cadastro route; only a confirmed authenticated session grants access to protected account pages.
- Post-login routing uses a shared pure destination resolver with authenticated Cloud commerce reads, never the browser-local simulation store, so purchases determine the entry screen without changing access checks.
- Webinars live in Cloud (webinars, webinar_visits); public pages read published rows via server functions, visits are recorded by a public write-only server action, and admins manage/read through admin RLS — so tracking data is never exposed to visitors.
- The /conheca campaign is separate from the homepage and uses a dedicated form-first presentation inside the navigation-free SiteShell; the shared private interest action must successfully store contact details and independent consents before the video view mounts, so UI state never stands in for saved submissions.
- After successful campaign capture, remember only the visitor name and interest in versioned browser storage and restore after hydration; this skips repeated submissions on that browser without granting account or course access.
- The homepage body is a scoped static port of the approved Site v10 reference (HTML in src/lib/home-v10.ts, CSS scoped under .v10 in src/styles/home-v10.css) inside the shared SiteShell, so the platform header and footer stay unchanged.
- Homepage course comparisons use shared CSS subgrid rows so matching sections remain aligned without clipping variable-length text; the theoretical course preview uses the supplied complete image through a Lovable asset pointer to preserve its arbitration cover, isolated from learner records.
- The /sobre page body is a scoped static port of the Site v10 "Quem somos" reference (HTML in src/lib/sobre-v10.ts, reusing .v10 CSS) with the reference portraits as Lovable assets.
- The per-activity delivery limit is enforced by a database trigger that serializes inserts with a transaction advisory lock and assigns the attempt number; server and UI only mirror it, so direct or concurrent requests cannot exceed it.
- The answer key opens only after a delivery and while no delivery of that activity has a pending human review; learning_answers RLS, learnerData and answerKeyOpen share this rule so a later delivery never bypasses an open review.
- Course faculty: one Cloud record per professional, linked to courses and per-activity roles; RLS shows only active, display-authorized rows, photos use a private bucket with signed URLs, and src/lib/professionals.ts falls back to the course lead, so people are never duplicated or invented.
- Automated grading: a submission-insert trigger queues one learning_ai_evaluations row; src/lib/ai-grading.server.ts processes it under a DB lease (learner kick + scheduled /api/public/jobs/ai-grading), service-role writes only, never touching human grades — idempotent and browser-independent.
