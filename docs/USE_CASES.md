# Use cases

One row per thing a user can *do*. Each is implemented by exactly one hook or API
function, so the table doubles as a map from behaviour to code.

Conventions:

- **Use case** — the user-facing action.
- **Entry point** — the hook or function that owns the sequence.
- **Tests** — the file that proves it.

---

## Auth (`src/features/auth`)

| Use case | Entry point | Tests |
| --- | --- | --- |
| Sign in with email and password | `useSignIn` → `authApi.login` | `components/SignInForm.test.tsx` |
| Stay signed in across browser restarts ("Remember me") | `useSignIn` → `tokenStorage.save({ remember: true })` | `components/SignInForm.test.tsx`, `lib/auth/tokenStorage.test.ts` |
| Keep the session to the current tab only | `tokenStorage.save({ remember: false })` | `lib/auth/tokenStorage.test.ts` |
| Be told why sign-in failed, in the API's words | `toApiError` → `ErrorState` | `components/SignInForm.test.tsx`, `lib/api/apiError.test.ts` |
| Be blocked from submitting invalid credentials | `validateCredentials` | `model/validateCredentials.test.ts` |
| Resume an existing session on reload | `useSession` | `components/AuthGuard.test.tsx` |
| Be redirected to sign-in when not authenticated | `AuthGuard` | `components/AuthGuard.test.tsx` |
| Have an expired access token refreshed silently | `httpClient` response interceptor | `lib/api/httpClient.test.ts` |
| Be signed out when the refresh token is rejected | `httpClient` → `endSession` | `lib/api/httpClient.test.ts` |
| Sign out deliberately | `useSignOut` | `hooks/useSignOut.test.tsx` |

**Notes**

- Validation is a pure function returning errors, never state read back in the same
  event — see `docs/CODE_REVIEW.md` §1.3.
- Concurrent 401s share one refresh; a retried request is retried at most once.

---

## Stores (`src/features/stores`)

| Use case | Entry point | Tests |
| --- | --- | --- |
| See the stores I own | `SelectedStoreProvider` → `storesApi.listOwnedStores` | `context/SelectedStoreProvider.test.tsx` |
| Switch which store the dashboard manages | `useSelectedStore().selectStore` | `components/StoreSwitcher.test.tsx` |
| Return to the store I last worked on | `selectedStorePreference` | `model/selectedStorePreference.test.ts` |
| Create a store | `useStoreForm` → `storesApi.saveStore` | `components/StoreForm.test.tsx`, `api/storesApi.test.ts` |
| Edit an existing store | `useStoreForm({ storeId })` | `components/StoreForm.test.tsx` |
| Attach a logo and a cover image | `saveStore` → `uploadFile` | `api/storesApi.test.ts`, `shared/components/ImagePicker.test.tsx` |
| Set the store location by address search | `LocationPicker` → `geocodeAddress` | `lib/maps/geocode.test.ts` |
| Set the store location by clicking or dragging on the map | `LocationPicker` → `reverseGeocode` | `lib/maps/geocode.test.ts` |
| Tag the store with categories | `CategorySelect` → `storesApi.listCategories` | `components/StoreForm.test.tsx` |
| Be shown which field the server rejected | `toStoreFormErrors` | `model/validateStore.test.ts`, `components/StoreForm.test.tsx` |

**Notes**

- `saveStore` writes the store *and* uploads its images. An upload failure rejects, so
  the UI cannot navigate away reporting a success that did not happen.
- A store at latitude/longitude `0` is valid; validation checks for `null`, not
  falsiness.

---

## Menu (`src/features/menu`)

| Use case | Entry point | Tests |
| --- | --- | --- |
| List the selected store's menu | `useMenuItems` → `menuApi.listMenuItems` | `components/MenuItemsTable.test.tsx` |
| Create a menu item | `useMenuItemForm` → `menuApi.saveMenuItem` | `components/MenuItemForm.test.tsx`, `api/menuApi.test.ts` |
| Edit a menu item | `useMenuItemForm({ menuItemId })` | `components/MenuItemForm.test.tsx` |
| Delete a menu item, with confirmation | `useMenuItems().removeItem` + `ConfirmDialog` | `components/MenuItemsTable.test.tsx` |
| Attach a photo to a menu item | `saveMenuItem` → `uploadFile` | `api/menuApi.test.ts` |
| Add a configuration group (e.g. "Size") | `useMenuItemForm().addConfiguration` | `components/MenuItemForm.test.tsx` |
| Choose how customers pick within a group | `updateConfiguration("type", …)` | `components/MenuItemForm.test.tsx` |
| Add a priced option to a group (e.g. "Large +$3.00") | `useMenuItemForm().addOption` | `components/MenuItemForm.test.tsx` |
| Remove an option or a whole group | `removeOption` / `removeConfiguration` | `components/MenuItemForm.test.tsx` |
| Be stopped from saving an incomplete item | `validateMenuItem` | `model/validateMenuItem.test.ts` |

**Notes**

- Configuration rows carry a client-only `key`; it is stripped before the payload is
  sent. Keying by array index used to corrupt sibling rows on delete.
- `listMenuItems` normalises the bare object the API returns for a one-item menu.

---

## Profile (`src/features/profile`)

| Use case | Entry point | Tests |
| --- | --- | --- |
| See who I am signed in as | `useProfile` → `profileApi.getProfile` | covered via `shared/layout/UserCard` |

---

## Orders and Analytics

Both are placeholders. `orders/page.tsx` renders an empty state; `analytics/page.tsx`
renders the vendored MUI template widgets against sample data
(`features/analytics/internals/data/gridData.tsx`). Neither has real use cases yet —
when they are built, add their rows here first.

---

## Cross-cutting

| Use case | Entry point | Tests |
| --- | --- | --- |
| Retry any failed load | `useAsyncData().reload` + `ErrorState onRetry` | `lib/hooks/useAsyncData.test.tsx` |
| Have an in-flight request cancelled on navigation | `useAsyncData` `AbortController` | `lib/hooks/useAsyncData.test.tsx` |
| Get a readable error for any failed write | `useAsyncAction` + `toApiError` | `lib/hooks/useAsyncAction.test.tsx` |
| Switch between light and dark | `ColorModeIconDropdown` | — |
| Land on a sensible page after a 404 | `app/not-found.tsx` | — |
