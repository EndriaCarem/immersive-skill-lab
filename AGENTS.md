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
- External payment and app-email adapters remain inactive until authorized integration; missing credentials never generate paid orders or sent-email claims.
- Mercado Pago uses server-only Checkout Transparente payments (card tokenized in-browser by the MP Brick; amount from the order). Production credentials (MERCADO_PAGO_ACCESS_TOKEN) enable live mode; only live attempts update orders and enrollments via the service-only apply_commerce_payment function, while test attempts never do. Signed callbacks reconcile against the provider API.
- Published terms are immutable versioned records; changes create a new version so existing order acceptance remains auditable.
- Visual styles are ported from the uploaded mockup as plain CSS classes in src/styles.css; reuse those classes so screens stay faithful to the mockup.
- Marketing pages use SiteShell (floating nav + footer); app screens use AppShell, which wraps SiteShell in a rounded frame, so navigation stays identical everywhere.
- The sign-in route uses a dedicated unframed account-entry layout rather than SiteShell so the form remains focused and follows the approved reference; authentication behavior is shared unchanged.
- Uploaded files (covers, attachments) are stored as blobs in IndexedDB via src/lib/files.ts and referenced by id from the store; rich text is saved as HTML in *Html fields and always rendered through the sanitizing Rich component.
- Brand manual v2 overrides live at the end of src/styles.css (flat buttons, 1px borders, signal colors, Newsreader via .doc-voice/.rich); the review-mark visual is the shared ReviewWindow component, reused on home and devolutiva.
- Interest and contact forms share InterestForm and a Zod schema; public write-only server actions store private submissions in Lovable Cloud, never in the unprotected local admin panel.
- Public-page responsive layouts and mobile navigation are shared through SiteShell and semantic CSS classes to keep institutional and catalog pages consistent.
- Founder identity and portrait references are centralized in src/lib/founders.ts so profile cards and compact avatars use the same mapping.
- Classify authentication failures by provider code or known message in src/lib/auth-errors.ts, never HTTP status alone, so different validation failures are not misreported.
- Signup without a session navigates to the public /confirmar-cadastro route; only a confirmed authenticated session grants access to protected account pages.
- Post-login routing uses a shared pure destination resolver with authenticated Cloud commerce reads, never the browser-local simulation store, so purchases determine the entry screen without changing access checks.
- Webinars live in Cloud (webinars, webinar_visits); public pages read published rows via server functions, visits are recorded by a public write-only server action, and admins manage/read through admin RLS — so tracking data is never exposed to visitors.
- The /conheca campaign is separate from the homepage; approved video and PDF URLs activate its gated capture flow using the existing private interest action, so missing assets never produce fake downloads or submissions.
