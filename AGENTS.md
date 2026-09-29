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

## Architecture

- GreenGrid uses a shared `AppShell` with separate TanStack route files for each major product area, keeping navigation and page ownership explicit.
- All dashboard visual values are semantic tokens in `src/styles.css`, so charts and interface surfaces share one maintainable theme.
- Shared energy assumptions (tariff, CO₂ factor) live in `settings-store.ts` (localStorage + useSyncExternalStore) and solar math in pure `solar.ts`, so pages stay in sync and the math is testable.
