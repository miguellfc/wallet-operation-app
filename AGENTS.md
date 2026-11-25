This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Project overview

Cashen is a personal finance app: wallets, income/expense/transfer operations, categories, debts, recurring operations, exchange rates and statistics. All UI text is in Spanish.

- Stack: Expo SDK 58, React Native 0.88, React 19 with the React Compiler, Expo Router (JS stacks from `expo-router/js-stack` and `expo-router/js-tabs`), Reanimated 4 + Worklets, Gesture Handler 3, expo-sqlite.
- Package manager: yarn (`yarn.lock`). Add dependencies with `npx expo install`.
- Backend (remote mode only): NestJS + MongoDB in the sibling repository `../wallet-operations`. Its search endpoints cap `size` at 200, so page through larger results.

### Two data modes, one codebase

`EXPO_PUBLIC_DATA_SOURCE` (`src/lib/data-source.ts`, `isLocal`) selects the data layer at build time:

- `local`: everything lives on the device in SQLite (`src/lib/local-db/`, also on web). No login: a local profile created on first launch plus a required PIN lock (`src/features/lock/`). Backup export/import (JSON) exists only here.
- `remote`: REST API at `EXPO_PUBLIC_API_URL` with account login.

Every data function in `src/features/*/*-api.ts` must work in both modes: start with `if (isLocal) return local.someFunction(...)` backed by `src/lib/local-db/`, then the remote request. Business rules enforced by the backend (for example "a wallet can only be deleted when its balance is zero") must be mirrored in `local-db`.

`app.config.js` sets the Android package from the same variable: `com.cashen.local` or `com.cashen.app`, so both apps can be installed side by side. EAS profiles in `eas.json`: `local-apk` and `remote-apk` (internal APKs). Both are built from `dev`.

### Folder map

- `src/app/(tabs)`: Inicio (`index`), Estadística, Añadir, Billeteras, Operaciones.
- `src/app/(details)`: detail and form screens (wallet, debt, operation, recurrence, wallet statistics, add/edit forms).
- `src/app/(settings)`: settings, account, theme, categories, exchange rates, backup.
- `src/components/ui`: shared primitives (sheets, fields, buttons, motion, skeletons). Feature components live next to their area (`home`, `operations`, `wallets`, `statistics`, `add`, `lock`, `navigation`, `settings`).
- `src/features/<area>`: API clients, stores and option lists per area.
- `src/lib`: cross-cutting helpers (`format.ts`, `color.ts`, `motion.ts`, `use-api-data.ts`, `navigation.ts`, `local-db/`).
- `src/theme/index.ts`: palettes (dark and light), `spacing`, `radius`, `fonts`, `typography`, `themedStyles`.
- `scripts/generate-category-icons.js`: generates `src/features/categories/category-icons.ts` and `src/features/wallets/wallet-icons.ts` from `@iconify-json/solar`.

## Code conventions

- No comments in code.
- Single quotes, trailing commas, about 120 columns. Files use CRLF line endings; keep them when editing or generating files.
- Styles: `themedStyles(() => ({ ... }))` and tokens from `@/theme` (`colors`, `spacing`, `radius`, `typography`). No hard-coded colors; call `useThemeName()` in screens so they re-render on theme changes.
- Text on colored backgrounds: `textOn(background)` for selected chips, buttons and other brand fills; `onColor(background)` for icons on arbitrary colors; `badgeIcon()` for the wallet badge.
- Data loading: `useApiData(load)` refetches on focus and keeps the previous data while reloading. While data is missing, render a `Skeleton` from `src/components/ui/skeleton.tsx` that mirrors the screen layout. It appears after a 400 ms delay. Do not use `ActivityIndicator` for page loads; it is only for in-button or load-more progress.
- Tabs and detail screens render `StickyHeader` (greeting + settings button) above the scroll view. Settings screens use only `BackHeader`.
- Detail and settings stacks need `cardStyle: { flex: 1 }` and `useSwipeBack()` (`src/lib/navigation.ts`) for edge-swipe back.
- Category colors: resolve them with `useCategoryColor()` (`src/features/categories/category-colors.ts`), never from the snapshot stored on an operation. Call `refreshCategoryColors()` after creating, editing or deleting categories or importing a backup. Operation list rows deliberately keep the income/expense/transfer color.
- Wallet colors come from `WALLET_COLORS` (sorted by hue). Icon lists for categories and wallets must not share any Solar icon and need at least 20 entries each; the generator script enforces this.

## Motion system

- Shared easing and timing live in `src/lib/motion.ts`. In `css.create` use `cubicBezier(...)` (`CSS_EASE_*`); string timing functions crash on native.
- Any helper called from a worklet needs a `'worklet'` directive.
- Entrances: `Reveal`/`Stagger` inside `RevealScrollView` replay on scroll in both directions and on every focus; use `ViewReveal` for virtualized lists (`SectionList`/`FlatList`), never `entering` on virtualized rows.
- Numbers and charts: `AmountText` (CountUp) and `Grow`. Wrap a screen in `<ReplayOnFocus value={{ counts: false, charts: false }}>` so they animate only on first view or when a value changes. Use `valuesKey`/`sameValue` to compare amounts (server floats jitter). `memory` on an amount and `once` on `Grow` persist across remounts.
- Web gotchas: a shared `Keyframe` gets stuck, so use predefined builders or shared values. CSS animations restart when an element moves in the DOM or goes from `display: none` to visible, so hide inactive views with absolute positioning and `opacity: 0`.
- Respect `useReducedMotion()` in every new animation.

## Testing changes

- Before declaring a task done: `npx tsc --noEmit` and `npx expo lint`.
- Do not stop or reuse the developer's own dev server on port 8081. To try a change in a browser, run a separate local-mode server, then create a profile (and PIN) on first launch: `EXPO_PUBLIC_DATA_SOURCE=local CI=1 npx expo start --web --port 8083 --clear`.
- Metro sometimes serves stale modules after edits; restart it with `--clear` before trusting what you see.

## Git workflow

- Work in the main checkout; do not create worktrees.
- Do not commit unless asked. Branch from `dev` as `feature/<name>` or `fix/<name>` and open pull requests into `dev`.
- Commit messages: `[Feat] Short title` or `[Fix] Short title`, a blank line, then `-` bullet points describing the change.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md
