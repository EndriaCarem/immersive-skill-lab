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

- App data (programs, enrollments, submissions, certificates) lives in a browser-local store in src/lib/store.ts; move it to Lovable Cloud before multi-user use, since nothing is shared between devices yet.
- Visual styles are ported from the uploaded mockup as plain CSS classes in src/styles.css; reuse those classes so screens stay faithful to the mockup.
- Marketing pages use SiteShell (floating nav + footer); app screens use AppShell, which wraps SiteShell in a rounded frame, so navigation stays identical everywhere.
- Uploaded files (covers, attachments) are stored as blobs in IndexedDB via src/lib/files.ts and referenced by id from the store; rich text is saved as HTML in *Html fields and always rendered through the sanitizing Rich component.
- Brand manual v2 overrides live at the end of src/styles.css (flat buttons, 1px borders, signal colors, Newsreader via .doc-voice/.rich); the review-mark visual is the shared ReviewWindow component, reused on home and devolutiva.
- Interest and contact forms share InterestForm and a Zod schema; public write-only server actions store private submissions in Lovable Cloud, never in the unprotected local admin panel.
- Public-page responsive layouts and mobile navigation are shared through SiteShell and semantic CSS classes to keep institutional and catalog pages consistent.
