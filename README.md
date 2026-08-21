# Makalu Web

Backoffice for the Makalu delivery platform. Store owners sign in, manage their stores
and menus, and (in future) work their orders and analytics.

Built with **Next.js 16** (App Router), **React 19**, **TypeScript**, **MUI 7**, and
**Axios**, against a separate Makalu REST API.

---

## Getting started

### Prerequisites

- Node.js 20.19+ (or 22+)
- npm 10+
- Access to a running Makalu API

### Install and run

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run dev                  # http://localhost:3000
```

### Environment variables

Both are `NEXT_PUBLIC_*`, meaning they are **inlined into the browser bundle** at build
time. Never put a secret in either.

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_API_BASE_URL` | yes | Base URL of the Makalu REST API. The app throws on boot without it. |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | no | Store location picker. Without it the picker shows a message instead of a map. |

Because the Maps key ships to the browser, restrict it by **HTTP referrer** and by
**API** in the Google Cloud console. That is the only real control over it.

Since these are build-time constants, **a production image is bound to the API URL it
was built with**. Build one image per environment, or move to a runtime-config
endpoint.

### Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server with hot reload |
| `npm run build` | Production build (`output: "standalone"`) |
| `npm start` | Serve a production build |
| `npm run lint` | ESLint (flat config, `next/core-web-vitals` + `next/typescript`) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest, single run |
| `npm run test:watch` | Vitest in watch mode |
| `npm run test:coverage` | Vitest with V8 coverage and thresholds |

Before opening a PR: `npm run lint && npm run typecheck && npm test`.

### Docker

```bash
docker build -t makalu-web \
  --build-arg NEXT_PUBLIC_API_BASE_URL=https://api.example.com .
docker run -p 3000:3000 makalu-web
```

`next.config.mjs` sets `output: "standalone"`, so the image only needs the `.next/standalone`
output plus `.next/static` and `public/`.

---

## How the system is designed

### Layers

Dependencies point in one direction. Nothing below a line may import from above it.

```
        app/            Routing only. A page reads its params and renders a feature.
          │
        features/       One folder per business capability.
          │             components → hooks → api → model
          │
        shared/         Reusable UI and layout with no business knowledge.
          │
        lib/            Infrastructure: HTTP, auth storage, config, generic hooks.
```

The rule that keeps this honest: **`lib/` and `shared/` never import from
`features/`.** A feature may use anything below it; a sibling feature is imported
explicitly and sparingly (menu depends on stores for "which store am I in?").

### Directory map

```
src/
├── app/                      # Next.js App Router — thin routing shell
│   ├── layout.tsx            # The one ThemeProvider for the whole app
│   ├── page.tsx              # Redirects to the dashboard or to sign-in
│   ├── error.tsx             # Render-error boundary
│   ├── not-found.tsx
│   ├── sign-in/page.tsx
│   └── dashboard/
│       ├── layout.tsx        # AuthGuard + SelectedStoreProvider + chrome
│       ├── orders/           analytics/
│       ├── menu/             menu/new/   menu/[menuItemId]/
│       └── stores/new/       stores/[storeId]/
│
├── features/
│   ├── auth/       api · components · hooks · model
│   ├── stores/     api · components · context · hooks · model
│   ├── menu/       api · components · hooks · model
│   ├── profile/    api · hooks
│   └── analytics/  vendored MUI template widgets (placeholder)
│
├── shared/
│   ├── components/ LoadingState · ErrorState · EmptyState · ConfirmDialog ·
│   │               ImagePicker · PageHeader
│   ├── layout/     SideMenu · AppNavbar · Header · MenuContent · UserCard · …
│   └── theme/      AppTheme + MUI (and MUI X) customizations
│
├── lib/
│   ├── api/        httpClient (interceptors) · apiError · media
│   ├── auth/       tokenStorage
│   ├── config/     env
│   ├── format/     currency
│   ├── hooks/      useAsyncData · useAsyncAction
│   └── maps/       geocode
│
└── test/           renderWithProviders and other test helpers
```

### Anatomy of a feature

Every feature folder has the same four parts, in dependency order:

| Folder | Contains | May import |
| --- | --- | --- |
| `model/` | Types, constants, pure validation and mapping functions. No I/O, no React. | `lib/format` |
| `api/` | One function per API operation. Owns URLs, verbs, and payload shaping. | `lib/api`, own `model` |
| `hooks/` | Use cases. Compose `api` with `useAsyncData`/`useAsyncAction`, own form state, handle navigation. | own `api` + `model`, `lib/hooks` |
| `components/` | Presentation. Render what a hook returns; no `http` calls, no URLs. | own `hooks`, `shared/components` |

A screen is therefore readable top to bottom: the component says *what it looks like*,
the hook says *what happens*, the API module says *where it goes*.

### Data flow

```
component ──renders──▶ hook ──calls──▶ api function ──▶ httpClient ──▶ Makalu API
    ▲                    │                                  │
    └── state, errors ───┘            interceptors: attach token, refresh on 401
```

- **Reads** go through `useAsyncData`: loading/error state, abort on unmount, `reload`.
- **Writes** go through `useAsyncAction`: pending/error state, and a result object
  (`{ ok: true, value } | { ok: false, error }`) so the caller can branch immediately
  instead of reading state that has not updated yet.
- **Failures** are normalised by `toApiError` into `{ status, message, internalCode,
  fieldErrors }`, so the UI always shows the backend's message rather than
  "Request failed with status code 422".

### Authentication

1. `POST /auth/login` returns an access/refresh pair.
2. `tokenStorage` persists them — `localStorage` for "remember me", `sessionStorage`
   otherwise. It is the only module that touches storage.
3. `httpClient`'s request interceptor reads the access token **per request**, so a
   refreshed token takes effect immediately.
4. On a `401`, the response interceptor refreshes once (concurrent 401s share the
   single in-flight refresh), retries the original request, and marks it so it can
   never loop.
5. If the refresh fails, the session is cleared and the browser goes to `/sign-in`.
6. `AuthGuard` keeps unauthenticated users out of `/dashboard`.

### Security model

**This is a browser-side token client, and it is a convenience boundary, not a
security boundary.** Tokens live in `localStorage`/`sessionStorage`, so any script
executing on the page can read them; `AuthGuard` only decides what to render.

What actually protects data is the API: every request is authorised server-side, and
the client is assumed hostile. Accepted mitigations:

- Short-lived access tokens with refresh rotation.
- A strict Content-Security-Policy in front of the app.
- Restricting the public Maps key by referrer.

The real fix is `httpOnly`, `SameSite=Strict` cookies set by the API, plus Next
middleware for route protection. That requires an API change and is tracked as future
work.

### Selected store

The dashboard is scoped to one store at a time. `SelectedStoreProvider` owns that
choice as ordinary React state and persists it (per tab) through
`selectedStorePreference`. Any component can read it with `useSelectedStore()`.

It replaced a DOM `CustomEvent` bus plus three independent `sessionStorage` reads that
could drift out of sync — see `docs/CODE_REVIEW.md` §2.2.

### Theme

One `createTheme` call in `src/shared/theme/AppTheme.tsx`, mounted once in the root
layout, covering both MUI core and MUI X. `InitColorSchemeScript` applies the stored
light/dark preference before first paint. **Do not nest a second `ThemeProvider`.**

### Testing

Vitest + React Testing Library + jsdom. 170 tests; coverage thresholds are enforced in
`vitest.config.mts` and are a floor, not a target.

The rule of thumb: **test behaviour through the public surface.**

- Pure functions (`model/`) directly.
- API modules with `http` mocked, asserting the request that goes out.
- Hooks via `renderHook` when they have no meaningful UI.
- Components via `renderWithProviders` and role/label queries — the way a user finds
  things — never by reaching into internals.

`src/test/renderWithProviders.tsx` wraps `render` with the app theme and re-exports
everything from RTL, so tests import from one place.

---

## Further reading

- [`docs/CODE_REVIEW.md`](docs/CODE_REVIEW.md) — the audit this architecture came out
  of: every defect found, and what was done about it.
- [`docs/USE_CASES.md`](docs/USE_CASES.md) — every user-facing action, its entry point,
  and the test that covers it.
- [`AGENTS.md`](AGENTS.md) — how to add a feature or change an existing one without
  breaking the conventions above.

## Known gaps

- Orders and Analytics are placeholders; Analytics renders template sample data.
- Auth relies on browser storage (see **Security model**).
- No i18n layer; UI strings are inline English.
- No server-side data fetching — every screen is a client component talking to the API
  from the browser.
