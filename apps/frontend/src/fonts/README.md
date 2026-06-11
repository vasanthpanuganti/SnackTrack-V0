# Self-hosted fonts

Variable fonts vendored from the Fontsource npm packages so production
builds are hermetic (no build-time Google Fonts fetch):

- `inter-latin-wght-normal.woff2` — Inter (UI/body), from `@fontsource-variable/inter`
- `fraunces-latin-full-normal.woff2` / `-italic.woff2` — Fraunces (display), from `@fontsource-variable/fraunces`

Both typefaces are licensed under the SIL Open Font License 1.1.
Loaded via `next/font/local` in `src/app/layout.tsx`.
