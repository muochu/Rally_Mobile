# Rally — Engineering Rules

These rules apply to every line of code. Cursor must follow them on every prompt without exception.

---

## 1. TypeScript

- `strict: true` in tsconfig. No exceptions.
- Never use `any`. If unavoidable, use `unknown` and narrow with type guards.
- Use Zod schemas to validate every external input: Supabase responses, calendar events, push notification payloads, deep links.
- Prefer `type` aliases for unions, `interface` for object shapes that may be extended.
- All exported functions have explicit return types.
- All async functions return `Promise<T>` with the T spelled out.

---

## 2. File and folder structure

```
src/
  app/                 # Expo Router screens (file-based routing)
    (auth)/
    (onboarding)/
    (tabs)/
      hub.tsx
      matches.tsx
      courts.tsx
      profile.tsx
    match/
      [id].tsx
  components/
    ui/                # Primitive UI: Button, Card, Avatar, Pill, Sheet
    feature/           # Feature components: PlayerCard, SlotPicker, MatchCard
  lib/
    supabase.ts
    calendar/          # Apple + Google + merge logic
    overlap.ts         # Pure overlap engine
    notifications.ts
    analytics.ts       # PostHog wrapper
    errors.ts          # Error types and Sentry helper
    env.ts             # Validated env exports
  hooks/               # Custom hooks (useAvailability, useMatches, etc.)
  store/               # Zustand stores
  types/               # Shared TypeScript types
  theme/               # Design tokens (colors, spacing, typography)
  utils/               # Pure utilities (date formatters, etc.)
tests/
  unit/                # Vitest tests for pure logic
  e2e/                 # Maestro tests for critical flows
```

**Rules:**

- One screen per file. One component per file.
- Files use `kebab-case.tsx`. Components inside use `PascalCase`.
- Hooks start with `use`, return objects not tuples (`{ data, isLoading, error }` not `[data, isLoading]`).
- No barrel files (`index.ts` re-exports). Import from the source path.
- Max file length: 300 lines. Refactor before exceeding.

---

## 3. Security (non-negotiable)

### Row-level security

Every table has RLS enabled. Every table has explicit policies. No exceptions.

```sql
-- Profiles: users read/write own profile, read others' public fields
create policy "users read own profile" on profiles
  for select using (auth.uid() = id);
create policy "users update own profile" on profiles
  for update using (auth.uid() = id);
create policy "users read public profile fields" on profiles
  for select using (true);  -- limit to public columns via views

-- availability_blocks: ONLY the owner can read or write their own
create policy "users manage own availability" on availability_blocks
  for all using (auth.uid() = user_id);

-- matches: only participants can read or modify
create policy "participants read matches" on matches
  for select using (auth.uid() in (player_a, player_b));
create policy "participants update matches" on matches
  for update using (auth.uid() in (player_a, player_b));

-- schedule_requests: requester and recipient only
create policy "participants read requests" on schedule_requests
  for select using (auth.uid() in (requester_id, recipient_id));
```

### Calendar privacy (the trust layer)

- Read calendar events client-side only.
- Strip everything except `startDate` and `endDate` BEFORE any network call.
- Never log event titles, locations, attendees, or descriptions to Sentry, PostHog, or anywhere.
- A test must verify availability_blocks rows never contain non-timestamp data.

### Secrets

- No keys in source. All secrets in `.env`, validated at startup via `lib/env.ts`.
- `.env` is in `.gitignore`. `.env.example` is committed with placeholder values.
- `service_role` Supabase key is server-only (Edge Functions). Client uses anon key.
- Stripe secret key never touches client.
- Rotate any key that has appeared in chat, screenshots, or commits.

### Auth

- Use Supabase Auth. Don't roll custom session logic.
- Sessions persist via `expo-secure-store` (encrypted keystore), not AsyncStorage.
- Apple Sign-In and Google OAuth via Supabase Auth providers.
- Sign-out clears all local state and revokes Supabase session.

### Input validation

- Every Supabase query result is parsed through Zod before use.
- Every form submission validates client-side then server-side (Edge Function).
- Never trust client-supplied IDs for ownership checks — let RLS handle it.

---

## 4. Error handling

### Three categories

1. **Recoverable user errors** (network blip, calendar permission revoked) — show calm inline UI with retry.
2. **Unexpected errors** (Supabase down, malformed response) — log to Sentry, show generic toast, never expose stack traces.
3. **Logic errors** (impossible state) — throw, log, fail fast in development.

### Pattern

```typescript
import { reportError } from '@/lib/errors';

try {
  const result = await dangerousOperation();
  return result;
} catch (error) {
  reportError(error, { context: 'scheduleMatch', userId });
  throw new UserFacingError('Could not schedule. Please try again.');
}
```

- Use a custom `UserFacingError` class for messages safe to display to users.
- Every catch block either handles, rethrows as `UserFacingError`, or logs to Sentry.
- No silent catches. No `catch (e) {}`.

---

## 5. State management

- **Server state:** TanStack Query (`@tanstack/react-query`) for all Supabase reads. Cache, retry, refetch on focus.
- **Client state:** Zustand for global UI state (auth user, theme, current onboarding step).
- **Form state:** `react-hook-form` with Zod resolver.
- **Realtime:** Supabase realtime channels feed into TanStack Query cache via `queryClient.setQueryData`.

Don't mix server state into Zustand. Don't fetch in `useEffect` when Query exists.

---

## 6. Testing

- **Unit tests** (Vitest): every pure function in `lib/` has tests. Overlap engine has 100% branch coverage.
- **Component tests** (React Native Testing Library): critical components (SlotPicker, ConfirmBook).
- **E2E tests** (Maestro or Detox): three critical flows — sign up, schedule a match, complete a match.
- CI runs on every PR. No merge without green tests.
- `MockCalendarProvider` swaps in for `expo-calendar` in tests; deterministic seeded busy blocks.

---

## 7. Code style

- ESLint + Prettier enforced via pre-commit hook (`husky` + `lint-staged`).
- No comments explaining what code does. Comments only for why (non-obvious decisions).
- No console.log in committed code. Use the logger in `lib/errors.ts`.
- Never disable ESLint rules inline without an explanation comment.
- Imports sorted: external, then `@/...`, then relative. Auto-handled by Prettier plugin.

---

## 8. Performance

- Lists with > 20 items use `FlashList`, not `FlatList` or `.map`.
- Images use `expo-image` with placeholder + cache.
- Memoize expensive selectors with `useMemo`. Memoize event handlers passed to children with `useCallback`.
- Lazy-load non-tab screens.
- Bundle analyzer runs on every release build.

---

## 9. Accessibility

- Every interactive element has `accessibilityLabel` and `accessibilityRole`.
- Touch targets minimum 44x44 pt.
- Test with VoiceOver before every release.
- Color contrast ratio ≥ 4.5:1 for text, 3:1 for UI elements.
- Respect Dynamic Type — never hard-code font sizes for screen readers.

---

## 10. Environment and config

```typescript
// lib/env.ts
import { z } from 'zod';

const schema = z.object({
  EXPO_PUBLIC_SUPABASE_URL: z.string().url(),
  EXPO_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: z.string().min(1),
  EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: z.string().min(1),
  EXPO_PUBLIC_MAPBOX_TOKEN: z.string().startsWith('pk.'),
  EXPO_PUBLIC_POSTHOG_KEY: z.string().optional(),
  EXPO_PUBLIC_SENTRY_DSN: z.string().url().optional(),
});

export const env = schema.parse(process.env);
```

App fails fast at startup if any required env var is missing or malformed.

---

## 11. Database migrations

- Every schema change goes through a numbered migration file: `supabase/migrations/YYYYMMDDHHMMSS_description.sql`.
- Never edit a migration after it has been applied to production. Add a new one.
- `supabase db reset` must reproduce production schema from migrations alone.
- Seed data lives in `supabase/seed.sql` for local dev only.

---

## 12. Logging and observability

- Sentry for errors and performance traces.
- PostHog for product analytics (funnel events only — signup, onboarding complete, first sync, request sent, match confirmed, match completed).
- Never log PII, calendar event content, or auth tokens.
- Log levels: `error`, `warn`, `info`. Use `info` sparingly; `debug` only in dev.

---

## 13. App Store readiness

- Privacy manifest (`PrivacyInfo.xcprivacy`) declares all data collection.
- App Privacy questionnaire matches actual data flows: Calendar (linked to user), Identifiers, User Content.
- App Tracking Transparency prompt required before any analytics that share with third parties.
- Permission strings (`NSCalendarsFullAccessUsageDescription`, `NSLocationWhenInUseUsageDescription`) are user-friendly and specific:
  - Calendar: "Rally reads only your free/busy times to find when you and other players can play. Event titles and details stay private."
  - Location: "Rally uses your location to show nearby players and courts."
- TestFlight build before App Store submission. Ship to internal testers first.

---

## 14. Don't do these things

- Don't use `localStorage` or `AsyncStorage` for tokens — use `expo-secure-store`.
- Don't store calendar event titles or content in Supabase. Ever.
- Don't ship without RLS enabled on a new table.
- Don't disable strict TypeScript "just for now."
- Don't add a dependency to solve a 10-line problem.
- Don't write a comment that says what the code already says.
- Don't paste secrets into chat, screenshots, or commits.
- Don't skip the migration system once you have one.

---

## How to use these rules

When prompting Cursor:

1. Open the file you want to work on.
2. Reference RULES.md, SPEC.md, and DESIGN.md in the prompt.
3. Tell Cursor what to build for the current phase.
4. After the work, ask Cursor: "Review your changes against RULES.md and fix violations."

These rules don't slow you down. They prevent you from rebuilding everything later.
