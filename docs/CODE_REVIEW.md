# Makalu Web — Code Review

Review date: 2026-08-21
Scope: entire `src/` tree (7.4k LOC), build config, dependency manifest.
Baseline commit: `42a74bc`.

Findings are grouped by severity. Each one records **what**, **why it matters**, and the
**resolution** applied during the refactor that followed this review.

---

## 1. Blocking defects

### 1.1 `dashboard/layout.tsx` reimplements the App Router — and discards `children`

`src/app/dashboard/layout.tsx` accepted `children` but never rendered it. Instead it kept a
hand-maintained map plus regexes:

```ts
const menuPages: Record<string, React.ComponentType> = {
  "/dashboard/orders": Orders,
  "/dashboard/menu": Menu,
  ...
};
const menuItemMatch = pathname.match(/^\/dashboard\/menu\/(\d+)$/);
```

Consequences:

- Every `page.tsx` under `/dashboard` was dead code; the layout re-imported and re-rendered
  the same components itself.
- `stores/[storeId]/page.tsx` never ran — the layout special-cased `isStoreRoute` and
  re-parsed the id out of the pathname.
- Adding a route required editing the layout, a shotgun-surgery/OCP violation.
- Unknown paths silently fell back to `Orders` instead of `not-found`.
- The whole subtree is one client component, so no route ever got streaming, per-route
  `loading.tsx`, or code splitting.

**Resolution:** deleted the map and the regexes. The layout now renders `{children}` and each
route is a real `page.tsx`. Dynamic params come from the segment, not from `usePathname()`.

### 1.2 Auth interceptors stack without bound and re-inject a stale token

`installAuth(accessToken)` (`src/functions/installAuth.ts`) was called from `useAuthTokenStatus`,
which runs in both `app/page.tsx` and `dashboard/layout.tsx`, and again after sign-in. Each call
did `http.interceptors.request.use(...)` with no eject, so the interceptor list grew on every
mount.

Worse, the token was captured in a closure. After a silent refresh the response interceptor put
the new token on the retried request config — but that retry passes through the _request_
interceptor again, which overwrites `Authorization` with the **old, expired** token. Refresh
therefore could not succeed for the retried call, and `.finally(createSilentRefreshInterceptor)`
re-registered yet another response interceptor each cycle.

**Resolution:** interceptors are registered exactly once at module load
(`src/lib/api/httpClient.ts`). The request interceptor reads the token from `tokenStorage` at
call time rather than from a closure. Refresh is de-duplicated behind a single in-flight promise.

### 1.3 Sign-in validation reads stale state, so invalid input still hits the network

```tsx
<Button type="submit" onClick={validateInputs} ... />
```

`validateInputs()` calls `setEmailError(...)`; `handleSubmit` then reads `emailError` — in the
same event, before React has re-rendered. On the first bad submit the guard sees the _previous_
value (`false`) and posts the credentials anyway. `validateInputs`' return value was discarded.

**Resolution:** validation is a pure function (`validateCredentials`) that returns the errors;
`handleSubmit` calls it directly and short-circuits on its return value.

### 1.4 Sign-in never shows the API's error message

Axios rejects on non-2xx, so this branch was unreachable dead code:

```ts
if (!response.status.toString().startsWith("2")) {
  /* ErrorResponse handling */
}
```

Real failures landed in `catch` and rendered `error.message` — i.e. the user saw
`Request failed with status code 401` instead of the backend's `internal_code`/`message`.

**Resolution:** `toApiError()` in `src/lib/api/apiError.ts` normalises any thrown value into the
backend `ErrorResponse` shape (with field errors), and is the single error path for all features.

### 1.5 `MenuTable` sets `width: "100vh"`

Viewport **height** used as a width. The table width tracked the window's height.

**Resolution:** removed; the table fills its container.

### 1.6 `menuItemId` is typed as a number but is a string

```ts
const menuItemId = params?.menuItemId as number | undefined; // actually a string
```

The `as` cast silenced the compiler. `savedItemId: number | undefined = menuItemId` then held a
string, and `PUT /stores/{storeId}/menu/{id}` worked only because template interpolation hides
the difference. Any arithmetic or strict comparison on it would have failed.

**Resolution:** route params are read as `string`, parsed once at the edge, and the form is
driven by an explicit `mode: "create" | "edit"` instead of by the truthiness of an id.

### 1.7 `StoreRequest.categories_ids: [number]` is a one-element tuple

`[number]` is a tuple of exactly one number, not `number[]`. The type was unused, which is the
only reason it never broke a build.

**Resolution:** file deleted; `StoreRequest` lives in `features/stores/model` with `number[]`.

---

## 2. Architecture

### 2.1 There is no architecture — only `app/`

Everything lived under routing folders. `src/components/` held two interface declarations and an
axios instance (as `.tsx` files with no JSX); `src/functions/` was a junk drawer with one `.js`
file in a TypeScript project. Domain types were declared _inside_ the components that used them,
so `MenuItem` existed twice, with contradictory shapes:

```ts
// MenuTable.tsx
configurations: Array<{ name: string; type: string; options: string[] }>
// MenuItemDetail.tsx
configurations: Array<{ name: string; type: "SINGLE_CHOICE" | ...; options: Option[] }>
```

`options` was `string[]` in one and `{name, additional_price}[]` in the other. Only luck (the
table never reads `options`) kept this from crashing.

**Resolution:** feature-sliced structure — `src/features/<feature>/{api,model,hooks,components}`,
with shared infrastructure in `src/lib` and reusable UI in `src/shared`. Each domain type is
declared once in its feature's `model/`.

### 2.2 Cross-component state travels through a DOM event bus + `sessionStorage`

`src/functions/eventBus.js` creates a detached `<div>` and dispatches `CustomEvent`s on it.
`"selectedStoreId"` was written to `sessionStorage` by `SelectContent` and read independently by
`MenuTable` and `MenuItemDetail`, with the string literal duplicated in three files.

Problems: untyped (plain JS), invisible to React's render model, silently a no-op during SSR,
impossible to test without a DOM, and it lets the three consumers desynchronise. It is a global
mutable singleton — the opposite of dependency inversion.

**Resolution:** `SelectedStoreProvider` (React context) owns the selected store, persists it
through a typed `selectedStorePreference` module, and exposes `useSelectedStore()`. The event bus
is deleted.

### 2.3 Two theme systems are mounted at once

`app/layout.tsx` wraps everything in `ThemeProvider theme={theme}` (from `src/theme.ts`), and
`AppTheme` then mounts a _second_ `ThemeProvider` with a completely different token set from
`shared-theme/themePrimitives.ts`. Two `CssBaseline`s, two `createTheme` calls, and tokens that
disagree about palette and typography.

**Resolution:** one theme (`src/shared/theme`), one provider, mounted once in the root layout.

### 2.4 Six hand-rolled copies of the same fetch-state machine

`MenuTable`, `MenuItemDetail`, `StoreDetail` (×3 effects), `SelectContent`, `SideMenu` each
declare `data` / `loading` / `error` triads with an inline `async` function in `useEffect`. None
cancels on unmount, so every one can `setState` after teardown. None share retry, error mapping,
or empty-state handling.

**Resolution:** `useAsyncData` (fetch-on-mount with abort + reload) and `useAsyncAction` (submit
with pending/error) in `src/lib/hooks`. Feature hooks compose them with the feature's API module.

### 2.5 API calls are inlined into JSX components

Components knew URLs, HTTP verbs, expected status codes, and multipart headers. Presentation and
transport were one unit, which is why none of it was testable without mocking axios inside a
render.

**Resolution:** one API module per feature (`features/*/api/*.ts`) exposing intention-revealing
functions (`listMenuItems`, `saveMenuItem`, `uploadMenuItemImage`). Components consume hooks;
hooks consume API modules. Swapping axios for `fetch` now touches one folder.

### 2.6 Auth is a client-only `useEffect` guard

`useAuthTokenStatus` reads `localStorage` in an effect; the layout redirects when it resolves to
"no token". The protected shell is therefore rendered (as a spinner) before the check finishes,
and there is no middleware. Tokens in `localStorage` are readable by any injected script.

This is inherent to a token-in-browser SPA against a separate API, so it is a **documented
accepted risk**, not something the refactor could remove. Mitigations recorded in the README:
short access-token lifetime, refresh rotation, and a strict CSP. Moving tokens to `httpOnly`
cookies set by the API is the real fix and is listed as future work.

### 2.7 `useAuthTokenStatus` does two jobs

A hook named "…Status" also _installed_ the HTTP interceptors as a side effect — so the transport
layer's configuration depended on which component happened to mount first. Single-responsibility
violation with a real ordering hazard.

**Resolution:** interceptor setup moved to module init of the HTTP client. The hook now only
reports session state.

---

## 3. Duplication

| Duplicated logic                           | Copies            | Where                                                                                | Resolution                                         |
| ------------------------------------------ | ----------------- | ------------------------------------------------------------------------------------ | -------------------------------------------------- |
| `${NEXT_PUBLIC_API_BASE_URL}/images/${id}` | 5                 | `MenuItemDetail`, `UploadLogoImage`, `UploadCoverImage`, `SelectContent`, `SideMenu` | `imageUrl(id)` in `lib/api`                        |
| `FormData` + `multipart/form-data` upload  | 3                 | `MenuItemDetail.uploadImage`, `StoreDetail` logo, `StoreDetail` cover                | `uploadFile()` in `lib/api`                        |
| `FileReader` → data-URL preview component  | 2                 | `UploadLogoImage`, `UploadCoverImage`                                                | one `ImagePicker` with an `avatar`/`cover` variant |
| Reverse-geocode callback                   | 3                 | `StoreDetail` effect, `LocationPicker` map click, marker drag                        | `geocode.ts` with `reverseGeocode()`               |
| `"selectedStoreId"` literal                | 3                 | `SelectContent`, `MenuTable`, `MenuItemDetail`                                       | one constant behind the context                    |
| Read token from local→session storage      | 3                 | `installAuth`, `clearTokens`, `useAuthTokenStatus`                                   | `tokenStorage` module                              |
| Centred `<CircularProgress/>` box          | 5                 | across pages                                                                         | `<LoadingState/>`                                  |
| Delete-confirmation dialog                 | 1 (about to be 3) | `MenuTable`                                                                          | `<ConfirmDialog/>`                                 |

---

## 4. Cognitive complexity

### 4.1 `StoreDetail` — 391 lines, 14 `useState`, one 130-line submit handler

`handleSubmit` validated location, validated the delivery fee, chose POST vs PUT, checked two
different "success" status codes, uploaded a logo, uploaded a cover, emitted an event, navigated,
and mapped `field_errors` back onto individual `setXError` calls — each with its own nested
try/catch. Roughly 20 branch points in one function.

Two silent-failure paths: if the API returned 200 on edit (instead of the expected 204) the code
fell through and did **nothing** — no navigation, no error. And an upload failure set
`uploadError` but the flow still navigated away, so the user never saw it.

**Resolution:** split into `useStoreForm` (state + validation), `saveStore` (the write use case,
including its uploads, as one transaction), and a presentational `StoreForm`. Errors are a single
`FormErrors` record, and success is `response.status < 300` rather than an exact-code match.

### 4.2 `MenuItemDetail` — 604 lines

One component owned: the fetch, the whole form, image selection _and_ upload, the configuration
list editor, the nested option editor, and the submit orchestration. The option editor alone is
~90 lines of JSX nested four levels deep inside two `.map()`s.

**Resolution:** `MenuItemForm` (fields + submit) → `ConfigurationList` → `ConfigurationCard` →
`OptionEditor`, with `useMenuItemForm` holding the state transitions.

### 4.3 `updateConfiguration(index, field: string, value: any)`

`any` on both the field name and the value, so `updateConfiguration(0, "typo", 123)` compiled.

**Resolution:** generic over `keyof Configuration`:
`updateConfiguration<K extends keyof Configuration>(i: number, field: K, value: Configuration[K])`.

---

## 5. React / Next.js correctness

- **`key={index}`** on the configuration and option lists. Removing a middle entry makes React
  reuse the wrong DOM node and the uncontrolled input values shift. Now keyed by a stable
  client-side `id`.
- **`onKeyPress`** is removed in React 19 (2 uses). Replaced with `onKeyDown`.
- **`inputProps`** is deprecated in MUI v7 — and `MenuItemDetail` used both `inputProps` and the
  modern `slotProps.htmlInput` in the same file. Unified on `slotProps`.
- **`<Grid>` without `size`** in `MenuItemDetail` — in MUI v7 a `Grid` item with no `size` prop
  does not participate in the 12-column layout, so the "two column" configuration header was
  never two columns.
- **Raw `<img>`** in five places instead of `next/image`, with no dimensions → layout shift.
  The five sites collapsed to one (`ImagePicker`), which fixes the duplication and the layout
  shift (the container has a fixed height). It is still a plain `<img>`, deliberately:
  `next/image` needs `images.remotePatterns` to name the image host, but the host comes from
  `NEXT_PUBLIC_API_BASE_URL` at runtime and differs per environment; and the same element must
  also render `data:` URL previews, which `next/image` cannot optimise anyway. Revisit if the
  API host is ever fixed at build time.
- **Effect dependency gaps**: `MenuItemDetail`'s effect calls `fetchMenuItem`, declared _below_
  it and omitted from the dep array; `SelectContent`'s `fetchStores` likewise.
- **Two `autoFocus` fields** in the sign-in form (email _and_ password) — the second wins,
  focusing the password field on load.
- **Raw `<h1>`/`<h3>` with inline `style`** inside an MUI tree, bypassing the typography scale.
- **No `error.tsx`, `loading.tsx`, or `not-found.tsx`** anywhere; an uncaught render error blanked
  the app.
- **`(window as any).google.maps.Geocoder()` behind `setTimeout(..., 1000)`** in `StoreDetail` —
  a race, not a guarantee. If Maps is slow it throws inside a timer, unhandled.

---

## 6. TypeScript & tooling

- `tsconfig.json` targets **`es5`** with `moduleResolution: "node"` — for Next 16 / React 19 this
  forces needless downlevelling (async/await → generators) and the wrong resolution algorithm for
  `exports` maps. Now `ES2022` + `bundler`.
- No `noUncheckedIndexedAccess`, no `noImplicitOverride`.
- `eslint` and `eslint-config-next` are in `devDependencies` but **there is no config file and no
  `lint` script** — the linter has never run.
- `src/functions/eventBus.js` and `theme/customizations/dataGrid.js` are JavaScript in a
  TypeScript project (`allowJs: true` was masking them).
- Nine `any` casts, mostly `(theme as any).palette.*` in `UploadCoverImage`, where the correct
  form is `(theme.vars || theme).palette.*`.
- **No test infrastructure at all** — no runner, no `test` script, zero test files.

---

## 7. Dead code

Removed: `app/about/`, `components/ProTip.tsx`, `components/Link.tsx`, `components/Copyright.tsx`,
`components/ModeSwitch.tsx`, `dashboard/Title.tsx.preview`, `dashboard/MenuContext.tsx` (never
imported), `dashboard/stores/StoreRequest.ts`, `components/CardAlert.tsx`, `components/Search.tsx`,
the unused `NotificationsRoundedIcon` import in `Header.tsx`, and the `menuPages` route map.

`SideMenuMobile` hardcoded `"Riley Carter"` and a Logout button wired to nothing — it now reads
the real profile and calls the real sign-out use case.

---

## 8. Product / polish

- **Mixed languages**: `"Por favor, selecione uma localização no mapa"` next to
  `"Delivery fee must be greater than 0"`. Standardised on English; the strings are now
  centralised per feature so a future i18n pass has one place to go.
- **Hardcoded `$`** with `price.toFixed(2)`. Replaced with `Intl.NumberFormat`.
- **`console.log("Selected store ID:", …)`** shipped to production.
- `console.error` as the only error channel in 12 places — replaced by surfaced UI errors.

---

## 9. Accepted as-is

- The MUI dashboard template widgets (`SessionsChart`, `PageViewsBarChart`, `StatCard`,
  `CustomizedTreeView`, `gridData.tsx`, …) are vendored template code backing the placeholder
  Analytics page. They were relocated under `features/analytics/` but not rewritten — they will be
  replaced wholesale when Analytics is built for real.
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is public by design (it ships to the browser). It must be
  restricted by HTTP referrer and API in the Google Cloud console; that is an infrastructure
  control, not a code change. Noted in the README.
