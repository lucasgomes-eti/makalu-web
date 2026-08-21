# Makalu Web

See **[AGENTS.md](AGENTS.md)** for the conventions to follow when changing this
codebase, **[README.md](README.md)** for the architecture, and
**[docs/USE_CASES.md](docs/USE_CASES.md)** for a map from behaviour to code.

Quick reminders:

- Verify with `npm run lint && npm run typecheck && npm test` before finishing.
- Layering: `app/` → `features/` → `shared/` → `lib/`. Never import upward.
- Components render; hooks decide; `api/` modules talk to the network.
- New routes are `page.tsx` files — never registered in a layout.
