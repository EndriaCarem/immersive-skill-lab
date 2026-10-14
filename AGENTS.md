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
