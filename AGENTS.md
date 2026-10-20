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

- Simulation content, submissions and grading remain an isolated browser-local demo; real accounts, commercial products, orders and enrollments use Cloud and must never merge demo learner records.
- Commercial writes use validated authenticated server functions and atomic database operations; prices, coupons, consent and entitlements are server-authoritative.
- Privileged roles live separately from editable profiles; administrative routes are client-only protected children with server-validated role checks.
- Administrative navigation uses an account-scoped role RPC query and stays hidden until verified; navigation visibility never replaces route or server authorization.
- External payment and app-email adapters remain inactive until authorized integration; missing credentials never generate paid orders or sent-email claims.
- Published terms are immutable versioned records; changes create a new version so existing order acceptance remains auditable.
- Visual styles are ported from the uploaded mockup as plain CSS classes in src/styles.css; reuse those classes so screens stay faithful to the mockup.
- Marketing pages use SiteShell (floating nav + footer); app screens use AppShell, which wraps SiteShell in a rounded frame, so navigation stays identical everywhere.
- Uploaded files (covers, attachments) are stored as blobs in IndexedDB via src/lib/files.ts and referenced by id from the store; rich text is saved as HTML in *Html fields and always rendered through the sanitizing Rich component.
- Brand manual v2 overrides live at the end of src/styles.css (flat buttons, 1px borders, signal colors, Newsreader via .doc-voice/.rich); the review-mark visual is the shared ReviewWindow component, reused on home and devolutiva.
- Interest and contact forms share InterestForm and a Zod schema; public write-only server actions store private submissions in Lovable Cloud, never in the unprotected local admin panel.
- Public-page responsive layouts and mobile navigation are shared through SiteShell and semantic CSS classes to keep institutional and catalog pages consistent.
- Founder identity and portrait references are centralized in src/lib/founders.ts so profile cards and compact avatars use the same mapping.
- Classify authentication failures by provider code or known message in src/lib/auth-errors.ts, never HTTP status alone, so different validation failures are not misreported.
- Signup without a session navigates to the public /confirmar-cadastro route; only a confirmed authenticated session grants access to protected account pages.
