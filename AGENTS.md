# Working on Makalu Web

Instructions for anyone — human or agent — changing this codebase.

Read [`README.md`](README.md) first for the architecture. This file is about *how to
make changes that fit it*.

---

## Non-negotiables

Run these before you consider work finished. All three must pass.

```bash
npm run lint && npm run typecheck && npm test
```

1. **No `any`.** ESLint enforces it outside `src/features/analytics`. If a type is
   genuinely unknown, use `unknown` and narrow it.
2. **No new `.js` files.** This is a TypeScript project; `allowJs` is off.
3. **`lib/` and `shared/` must never import from `features/`.** If shared code needs
   business knowledge, it is not shared code.
4. **One `ThemeProvider`**, in `app/layout.tsx`. Never nest another.
5. **No API calls in components.** Components call hooks; hooks call `api/` functions.
6. **No `sessionStorage` / `localStorage` outside `lib/auth/tokenStorage.ts` and
   `features/stores/model/selectedStorePreference.ts`.** Add a module if you need a
   third; do not scatter string keys.
7. **New routes are `page.tsx` files.** Never register a route in a layout — that was
   the single worst defect in the original code (`docs/CODE_REVIEW.md` §1.1).
8. **Every use case gets a row in `docs/USE_CASES.md`** and a test.

---

## Adding a new feature

Say you are adding **promotions**.

### 1. Model — types and pure rules

`src/features/promotions/model/promotion.types.ts`

```ts
export interface Promotion {
  id: number;
  store_id: number;
  name: string;
  discount_percent: number;
}

export interface PromotionFormValues {
  name: string;
  /** Kept as a string so a number input can be empty mid-edit. */
  discountPercent: string;
}

export const EMPTY_PROMOTION_FORM: PromotionFormValues = {
  name: "",
  discountPercent: "",
};

export function toFormValues(promotion: Promotion): PromotionFormValues {
  return {
    name: promotion.name,
    discountPercent: String(promotion.discount_percent),
  };
}
```

`model/validatePromotion.ts` — a pure function returning an errors object. **Never**
set state and read it back in the same event; return the errors and branch on them.

```ts
export function validatePromotion(values: PromotionFormValues): PromotionFormErrors {
  const errors: PromotionFormErrors = {};
  if (!values.name.trim()) errors.name = "Name is required.";
  return errors;
}
```

Keep API field names (`snake_case`) in the wire types and camelCase in form types. The
`api/` layer translates between them; nothing else should know both.

### 2. API — one function per operation

`src/features/promotions/api/promotionsApi.ts`

```ts
import http from "@/lib/api/httpClient";

export async function listPromotions(
  storeId: number,
  signal?: AbortSignal,
): Promise<Promotion[]> {
  const { data } = await http.get<Promotion[]>(`/stores/${storeId}/promotions`, {
    signal,
  });
  return data;
}
```

Rules:

- Accept and forward an `AbortSignal` on every read.
- Return `data`, not the Axios response. Callers should not know about `status`.
- Do not check specific success codes (`=== 204`). Axios already rejects on failure;
  matching exact codes is how the old `StoreDetail` silently did nothing on a 200.
- Do not catch errors here — let them reach `useAsyncAction`/`useAsyncData`.
- If an operation has two steps that must not be split (write, then upload an image),
  put both in one function, as `saveStore` and `saveMenuItem` do.

### 3. Hooks — the use case

`src/features/promotions/hooks/usePromotions.ts`

```ts
export function usePromotions() {
  const { selectedStoreId } = useSelectedStore();

  // `useCallback` is required: `useAsyncData` re-runs whenever `loader` changes.
  const loadPromotions = useCallback(
    (signal: AbortSignal) => listPromotions(selectedStoreId as number, signal),
    [selectedStoreId],
  );

  const promotions = useAsyncData(loadPromotions, {
    enabled: selectedStoreId !== null,
    errorMessage: "Could not load promotions.",
  });

  return { promotions: promotions.data ?? [], ...promotions };
}
```

For writes, use `useAsyncAction` and branch on the returned result:

```ts
const result = await save.run(values);
if (!result.ok) {
  setErrors(toPromotionFormErrors(result.error.fieldErrors));
  return;
}
router.push("/dashboard/promotions");
```

Never read `action.error` immediately after `await action.run(...)` — that reads the
pre-update render.

### 4. Components — presentation

- Use `LoadingState`, `ErrorState`, `EmptyState`, `ConfirmDialog`, `ImagePicker`,
  `PageHeader` from `shared/components` rather than rolling new ones.
- Handle all four states: loading, error (with `onRetry`), empty, and content.
- Give every interactive element an accessible name (`aria-label` on icon buttons,
  a real `label` on inputs). Tests query by role and name.
- Split a component when a section grows past ~120 lines or nests three `.map()`s
  deep — that is how `MenuItemDetail` reached 604 lines.
- Formatting money goes through `lib/format/currency`, never `toFixed(2)` with a `$`.

### 5. Routes

```
src/app/dashboard/promotions/page.tsx
src/app/dashboard/promotions/new/page.tsx
src/app/dashboard/promotions/[promotionId]/page.tsx
```

Dynamic params are `Promise`s in Next 16 and are always strings. Parse at the boundary
so everything downstream takes a `number`:

```tsx
export default async function EditPromotionPage({
  params,
}: {
  params: Promise<{ promotionId: string }>;
}) {
  const { promotionId } = await params;
  const parsedId = Number.parseInt(promotionId, 10);
  if (!Number.isInteger(parsedId) || parsedId <= 0) notFound();

  return <EditPromotionScreen promotionId={parsedId} />;
}
```

Add the destination to `NAVIGATION_ITEMS` in `src/shared/layout/MenuContent.tsx` if it
belongs in the sidebar. That array is the *only* place a top-level route is registered.

### 6. Tests

Mirror the source layout: `foo.ts` → `foo.test.ts` next to it.

```tsx
import { renderWithProviders, screen, userEvent } from "@/test/renderWithProviders";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("../api/promotionsApi", () => ({ listPromotions: vi.fn() }));
```

- Mock the **feature's API module** for component tests; mock `@/lib/api/httpClient`
  for API-module tests.
- Query by role and accessible name. No `container.querySelector`, no test ids for
  things a user can see.
- Name tests after the behaviour ("refuses to save without a name"), not the
  implementation ("calls setState").
- When you fix a bug, add the test that would have caught it and say so in a comment.
- An open MUI modal marks the rest of the page `aria-hidden`; use `{ hidden: true }`
  to query behind it.

### 7. Documentation

Add a row to the right table in `docs/USE_CASES.md`. If the change alters a rule in
this file or the architecture in the README, update those too — in the same commit.

---

## Changing an existing feature

1. **Find the use case** in `docs/USE_CASES.md`. It names the entry point and the test
   file.
2. **Change the lowest layer that can express it.** A new validation rule belongs in
   `model/`, not in a component. A changed endpoint belongs in `api/`.
3. **Run that feature's tests first**, then the full suite.
4. **Update the use-case row** if the behaviour changed.

If a change forces you to break one of the non-negotiables, the design is wrong for
what you are building. Say so and propose the change explicitly rather than working
around it quietly.

---

## Common traps in this codebase

| Trap | What to do |
| --- | --- |
| Inline arrow passed to `useAsyncData` | Wrap in `useCallback`, or it refetches every render |
| Reading `action.error` right after `await run()` | Use the returned result object |
| `key={index}` on an editable list | Use a stable client key (see `nextDraftKey`) |
| Validating by setting state, then reading it | Return the errors from a pure function |
| `<Grid>` without `size` | In MUI v7 it does not participate in the layout |
| `inputProps` / `onKeyPress` | Deprecated: use `slotProps.htmlInput` / `onKeyDown` |
| `(theme as any).palette` | Use `(theme.vars \|\| theme).palette` |
| Building an image URL by hand | Use `imageUrl(id)` from `lib/api/media` |
| Checking `if (latitude)` | `0` is a valid coordinate — check `!== null` |
| Adding a `console.error` as the error handling | Surface it in the UI via `ErrorState` |

---

## Dependencies

Prefer what is already here. Before adding a package, check whether `lib/` already
solves it — `useAsyncData`/`useAsyncAction` deliberately cover the ground a data
library would, at a fraction of the weight.

Genuine candidates when the need is real:

- **TanStack Query** — when screens need a shared cache or background refetching.
  Replace `useAsyncData`; the feature hooks are its only callers.
- **react-hook-form + zod** — when forms outgrow the `useXForm` + pure-validator
  pattern.

Both are architecture decisions. Raise them; do not slip them in with a feature.
