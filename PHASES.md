# Rally — Phase-by-Phase Build Prompts

Paste each phase prompt into Cursor one at a time. After each phase, verify it works before moving on.

**Important setup before Phase 1:**

1. Save `RULES.md`, `SPEC.md`, and `DESIGN.md` in the empty Rally-Mobile repo root
2. Open Cursor in the repo
3. Have your `.env` values ready: Supabase URL, Supabase anon key, Google web/iOS client IDs, Mapbox token

---

## Universal prompt prefix

Use this at the start of every phase prompt:

```
You are building Rally, a tennis scheduling app. Read these files first:
- RULES.md (engineering rules — non-negotiable, follow strictly)
- SPEC.md (product spec — screens, flows, data model)
- DESIGN.md (design system — premium sport feel, muted forest green accent)

After reading them, ask any clarifying questions, then proceed with the phase below.
```

---

## Phase 1 — Foundation

```
Phase 1: Foundation setup.

Initialize an Expo TypeScript project with Expo Router and the dependencies needed for Rally per the tech stack in SPEC.md. Set up:

1. Expo project with TypeScript strict mode
2. Folder structure exactly as specified in RULES.md section 2
3. ESLint + Prettier + Husky + lint-staged with the rules in RULES.md section 7
4. lib/env.ts with Zod validation for all env vars listed in RULES.md section 10
5. lib/supabase.ts with the typed Supabase client using expo-secure-store for session persistence
6. theme/ directory with three files: colors.ts, typography.ts, spacing.ts — exporting the exact tokens from DESIGN.md
7. Base navigation: tab navigator with placeholder screens for Hub, Matches, Courts, Profile
8. .env.example committed with placeholder values, .env in .gitignore
9. README.md with setup instructions
10. Vitest configuration and a smoke test that verifies env loading

Do not create the data tables yet. That comes in Phase 2.

When done, list the files you created and any decisions you made. Then stop and wait for verification.
```

**Verify before Phase 2:** `npm run start` opens Expo with the four placeholder tabs. `npm test` passes.

---

## Phase 2 — Database schema and RLS

```
Phase 2: Supabase schema and security.

Create the supabase/migrations/ directory with a single migration file containing:

1. All tables from SPEC.md exactly as specified
2. All indexes (including the geographic index on courts using ll_to_earth)
3. RLS enabled on every table
4. Every RLS policy from RULES.md section 3 plus any others needed to make SPEC.md flows work
5. A trigger that auto-creates a profiles row when a new auth.users row is created
6. A trigger that updates profiles.updated_at on every update

Also create supabase/seed.sql with 10 sample courts in Vancouver for local dev.

Then write a script (scripts/db-reset.sh) that resets the local Supabase, runs migrations, and seeds.

Important: the policy on availability_blocks must be `for all using (auth.uid() = user_id)` — only the owner can read or write their own availability. This is the privacy guarantee.

After running, write a Vitest test in tests/unit/rls.test.ts that uses two test users and verifies user A cannot read user B's availability_blocks via the anon client. This test must pass.

When done, run the migration locally and confirm it applies cleanly. Stop and wait for verification.
```

**Verify before Phase 3:** Migration applies. RLS test passes. Sample courts visible in Supabase dashboard.

---

## Phase 3 — Auth and onboarding

```
Phase 3: Authentication and onboarding flow.

Build the screens described in SPEC.md sections "Splash & Auth" and "Onboarding (5 steps)".

Implementation:
1. app/(auth)/sign-in.tsx — Apple, Google, Email options via Supabase Auth
2. app/(onboarding)/ folder with one file per step plus a shared layout that shows progress dots
3. Use react-hook-form + Zod for the form on each step
4. Use Zustand store at store/onboarding.ts to track partial state across steps
5. On final step completion, write all collected fields to the profiles row (which already exists from the auth trigger)
6. Calendar permission step uses expo-calendar.requestCalendarPermissionsAsync — read permission only. Do NOT request write permission yet.
7. After onboarding, redirect to (tabs)/hub

Design: follow DESIGN.md exactly. Buttons use accent.primary. Headlines use Display sizes. Background is background.primary (warm off-white). The progress dots use accent.primary for completed, border.secondary for upcoming.

Edge cases (per SPEC.md):
- Cancelled sign-in returns to sign-in screen with a calm error
- Calendar permission denied → still complete onboarding, mark a flag in profiles for later prompting
- Back button works on every step except step 1

When done, run the flow end to end and screenshot the final Hub. Stop and wait for verification.
```

**Verify before Phase 4:** New user can sign up, complete onboarding, land on Hub. Profile row populated correctly.

---

## Phase 4 — Calendar sync layer

```
Phase 4: Calendar sync.

Build the calendar sync system described in SPEC.md "Core flows" and RULES.md section 3 (privacy).

Implementation:
1. lib/calendar/apple.ts — reads next 14 days of events via expo-calendar, returns array of {start, end} only. Strip everything else immediately.
2. lib/calendar/google.ts — uses Google Calendar API freebusy endpoint via OAuth, returns same shape
3. lib/calendar/merge.ts — pure function that merges multiple busy interval arrays, de-duplicates overlaps, returns sorted non-overlapping busy blocks
4. lib/overlap.ts — pure function: takes two busy interval arrays, lookahead in days, min duration in minutes; returns array of mutual free slots sorted by soonest first
5. hooks/use-availability-sync.ts — orchestrates: read from each connected source, merge, upsert to availability_blocks, deletes stale rows for that user
6. Hook into app foreground via expo-application AppState listener
7. lib/calendar/mock.ts — MockCalendarProvider with deterministic seeded busy blocks for testing

Tests (tests/unit/):
- merge.test.ts — verify dedup, overlapping intervals, edge cases (empty array, single item, all overlapping)
- overlap.test.ts — 100% branch coverage. Cases: zero mutual slots, slots shorter than min duration, slots within preferred hours only, lookahead windows
- privacy.test.ts — feed mock calendar with events that have titles/descriptions, verify no field beyond start/end ever leaves the calendar/* module

Privacy assertions:
- Strip event content at the source (apple.ts, google.ts) — never let it propagate
- Never log calendar event objects, only counts and time ranges

When done, run all tests and confirm green. Sync should work end to end with a real Apple Calendar in the simulator. Stop and wait for verification.
```

**Verify before Phase 5:** Add a busy event in iOS Calendar app, open Rally, see availability_blocks populated in Supabase. All tests pass.

---

## Phase 5 — Scheduling Hub and Player Profile

```
Phase 5: Hub screen and player discovery.

Build the screens described in SPEC.md "Scheduling Hub" and "Player Profile Sheet".

Implementation:
1. app/(tabs)/hub.tsx — header, "Your free windows" section, "Players nearby" section, filter chip
2. components/feature/free-window-card.tsx — single card showing day, time range, duration
3. components/feature/player-card.tsx — avatar, name, UTR, distance, mutual overlap count
4. components/feature/player-profile-sheet.tsx — bottom sheet using @gorhom/bottom-sheet
5. hooks/use-free-windows.ts — uses TanStack Query to read availability_blocks, computes free windows in preferred hours
6. hooks/use-nearby-players.ts — TanStack Query, calls a Supabase RPC function get_nearby_players that returns players within X km sorted by overlap count
7. supabase/migrations/ — add the get_nearby_players function. It joins profiles with availability_blocks, computes overlap with caller, returns ranked list. Use earth_distance for proximity.

Design: per DESIGN.md.
- Free window cards: white background, 14px radius, 16px padding, big time as title, day+duration as meta
- Player cards: list rows, no card wrapper, 64px tall, 12px between rows
- Filter chip: pill style, accent when active
- Empty states per DESIGN.md "Empty states" section

Edge cases:
- Calendar not connected → empty state with "Connect calendar" CTA → routes to a dedicated permission screen
- No nearby players → "Try expanding your search" CTA
- Pull to refresh re-runs sync

When done, log in with a real account and confirm Hub renders correctly. Stop and wait for verification.
```

**Verify before Phase 6:** Hub shows your free windows from real calendar. Tapping a player opens the bottom sheet.

---

## Phase 6 — Mutual Availability and Confirm flow

```
Phase 6: The core scheduling flow.

Build the screens described in SPEC.md "Mutual Availability Picker", "Confirm & Book", and "Booked confirmation".

Implementation:
1. app/match/picker/[opponentId].tsx — Mutual Availability Picker. Uses lib/overlap.ts with current user's and opponent's availability_blocks. Toggle for 7 vs 14 day lookahead.
2. app/match/confirm/[opponentId]/[slotId].tsx — Confirm & Book. Re-validates overlap on mount. Shows match summary card and calendar event preview using DESIGN.md calendar event preview pattern.
3. app/match/booked/[matchId].tsx — Booked confirmation with success animation, two calendar event previews, "View in Calendar" deep link
4. lib/match-flow.ts — orchestrates the confirm action:
   a. Re-validate overlap (re-fetch availability for both)
   b. If invalid, throw UserFacingError "That slot is no longer free"
   c. Begin transaction: insert into matches, mark schedule_request accepted
   d. Request calendar WRITE permission (separate prompt now, per Apple guidelines)
   e. Write calendar event for current user via Calendar.createEventAsync
   f. Trigger Edge Function to send push to opponent + write opponent's calendar event when they next open the app
   g. Store event IDs in matches row
5. supabase/functions/notify-match-confirmed/ — Edge Function that sends push via Expo Push API
6. components/feature/calendar-event-preview.tsx — the styled preview matching iOS Calendar

Edge cases (critical):
- Re-validation fails → toast + back to picker
- Calendar write permission denied → match still saved, banner on confirmation screen "Add to your calendar manually" with a button to open native add-to-calendar
- Network failure during confirm → retry button, no partial state

Design: heavy emphasis on the calendar event preview — it's the trust moment. Use accent.soft background with 3px accent.primary left border.

Tests:
- E2E (Maestro): full flow from Hub → Player → Picker → Confirm → Booked
- Unit: match-flow re-validation logic with mocked stale data

When done, do a real end-to-end test with two test accounts. Stop and wait for verification.
```

**Verify before Phase 7:** Two test users can schedule a match. Calendar event appears in iOS Calendar app for both.

---

## Phase 7 — Matches tab

```
Phase 7: Matches list with three sub-tabs.

Build SPEC.md "Matches Tab" — Upcoming, Past, Pending.

Implementation:
1. app/(tabs)/matches.tsx with sub-tab segmented control
2. components/feature/match-card.tsx variants: upcoming, past, pending-incoming, pending-outgoing
3. hooks/use-matches.ts — TanStack Query, separate queries per sub-tab
4. Pending incoming: Accept/Decline buttons. Accept routes to picker pre-filled with that opponent. Decline calls an Edge Function that updates schedule_requests.status.
5. Pending outgoing: status display, cancel button
6. Past: rematch CTA → opens picker with same opponent. Review CTA → bottom sheet with star rating + no-show toggle.
7. Match completion: when current time > end_time + 30 min, show "Mark complete" CTA on the upcoming card. On tap, transition to past.
8. Cancellation flow: tap match → action sheet with Cancel option → confirms → deletes calendar events, updates status, sends push

Realtime: subscribe to schedule_requests and matches tables; update TanStack Query cache on changes from other devices.

Edge cases:
- Match cancelled by opponent → realtime push, toast on Matches tab
- Calendar event delete fails on cancel → leave description note, log to Sentry
- Both players try to cancel same match simultaneously → idempotent

When done, verify all four card states render correctly. Stop and wait for verification.
```

**Verify before Phase 8:** All sub-tabs work. Accept, decline, complete, rematch, cancel all functional.

---

## Phase 8 — Courts tab with Mapbox

```
Phase 8: Courts discovery.

Build SPEC.md "Courts Tab".

Implementation:
1. Install @rnmapbox/maps with the Expo config plugin
2. app/(tabs)/courts.tsx — map + list view
3. components/feature/court-marker.tsx — colored pin component (open/filling/full traffic states)
4. components/feature/court-detail-sheet.tsx — bottom sheet with court info and "Set as home court"
5. hooks/use-courts.ts — query courts within current viewport bounds
6. supabase/migrations/ — add get_courts_in_bounds RPC function
7. Court traffic logic: for now, mock the traffic calculation (open if no upcoming matches in next 2h, filling if 1, full if 2+)
8. Search bar uses Mapbox geocoding to recenter map
9. Set as home court → updates profiles.home_court_id
10. Surface attribution: "© Mapbox" small text per their license

Design:
- Map: light minimalist style (Mapbox style URL: mapbox://styles/mapbox/light-v11)
- Pins: 24px circle with 3px white border, traffic color fill
- User location pin: 14px accent.primary dot with pulse animation
- List below map sorted by distance, scrollable

When done, test on a real device with location permissions. Stop and wait for verification.
```

**Verify before Phase 9:** Map renders, pins appear in correct colors, set home court works.

---

## Phase 9 — Profile and settings

```
Phase 9: Profile tab.

Build SPEC.md "Profile Tab".

Implementation:
1. app/(tabs)/profile.tsx — sections per spec
2. components/feature/calendar-permissions-panel.tsx — shows each connected calendar, last sync time, revoke button
3. Revoke flow: deletes availability_blocks for that source, removes OAuth credentials, requires re-grant
4. Edit profile flow: avatar upload via expo-image-picker → Supabase Storage, edit name and UTR
5. Preferred hours editor: chip toggles that update profiles.preferred_hours
6. Notifications toggle: writes to profiles, gates push token registration
7. Privacy & data screen: link to privacy policy URL, "Delete my account" button that calls an Edge Function deleting all user data
8. Sign out: clears Supabase session, clears all Zustand stores, clears expo-secure-store, navigates to sign-in

Account deletion (App Store requires this):
- Edge Function: delete profile row → cascades to availability_blocks, schedule_requests, matches, reviews
- Show confirmation: "This permanently deletes your account, all matches, and all data. This cannot be undone."

When done, verify every option works. Stop and wait for verification.
```

**Verify before Phase 10:** All Profile sections functional, account deletion works.

---

## Phase 10 — Notifications, analytics, errors

```
Phase 10: Production observability.

Wire up the three observability layers.

Implementation:
1. Push notifications via expo-notifications:
   - Register for token after sign-in, store in profiles.push_token
   - Edge Functions for each trigger in SPEC.md "Push notification triggers" table
   - Cron Edge Function (pg_cron) for time-based triggers (24h before, 15min before, 48h request expiry)
   - Deep link handler: tapping a push routes to the right screen via Expo Router

2. PostHog analytics (lib/analytics.ts):
   - Wrapper that batches events, no PII
   - Track only the funnel events listed in SPEC.md "Analytics events"
   - Identify users by user_id only, no email
   - App Tracking Transparency prompt before initialization

3. Sentry (lib/errors.ts):
   - Initialize with EXPO_PUBLIC_SENTRY_DSN
   - reportError helper that scrubs PII and calendar content from breadcrumbs
   - Wrap top-level error boundary
   - Performance traces for critical paths: sign-in, calendar sync, schedule match

Privacy guards (test in tests/unit/):
- Verify no analytics event payload contains email, name, or calendar content
- Verify Sentry breadcrumbs scrub these fields

When done, trigger each push manually, fire each analytics event, throw a test error. Verify all three dashboards receive data. Stop and wait for verification.
```

---

## Phase 11 — App Store readiness

```
Phase 11: Final polish and submission prep.

1. Privacy manifest (PrivacyInfo.xcprivacy):
   - Declare data collection: Calendar (linked, app functionality), User ID (linked), Coarse Location (linked)
   - List required reason API usages
2. Permission strings in app.json (Info.plist additions):
   - NSCalendarsFullAccessUsageDescription: "Rally reads only your free/busy times to find when you and other players can play. Event titles and details stay private."
   - NSLocationWhenInUseUsageDescription: "Rally uses your location to show nearby players and courts."
   - NSPhotoLibraryUsageDescription: "Rally uses photos for your profile picture."
3. App Store assets:
   - Icon set (use the Rally wordmark, accent green background)
   - Launch screen
   - 5 screenshots: Hub, Picker, Confirm, Matches, Courts
4. App Store privacy questionnaire answers (in docs/app-store-privacy.md)
5. Terms of Service + Privacy Policy URLs in Profile
6. EAS Build configuration:
   - Production profile signs with App Store distribution cert
   - Internal profile for TestFlight
7. Run accessibility audit: VoiceOver every flow, verify all targets ≥ 44pt, contrast checked
8. Performance audit: bundle size < 30MB, cold start < 2s, no main-thread blocks > 16ms
9. Build and submit:
   - eas build --profile production --platform ios
   - eas submit --platform ios

Submit to TestFlight first. Get 5 internal testers through the full flow. Then submit to App Store review.

Final check: run the full test suite, lint, typecheck. Everything must be green.
```

---

## How to use this kit

**Day 1:**

1. Save RULES.md, SPEC.md, DESIGN.md, PHASES.md in the empty Rally-Mobile repo
2. Open Cursor with the universal prompt prefix + Phase 1 prompt
3. Let it run, verify, then move to Phase 2

**Each phase:**

- Use the universal prefix
- Paste the phase prompt
- After completion, ask Cursor: "Review your work this phase against RULES.md, DESIGN.md, and SPEC.md. Identify any violations or gaps and fix them."
- Verify the success criteria for that phase
- Commit and move on

**If something goes off:**

- Don't argue with Cursor about a rule. Quote the rule from RULES.md and tell it to fix.
- If a phase becomes too large, split it. Ask Cursor to do step 1-5 first, then continue.
- Save sessions before risky phases. Use git branches per phase.

**Estimated timeline solo, working evenings/weekends:**

- Phases 1–4: weekend 1 (foundation, schema, auth, calendar sync)
- Phases 5–7: weekend 2 (Hub, scheduling flow, matches)
- Phases 8–9: weekend 3 (courts, profile)
- Phases 10–11: week 4 (observability, App Store)

**Total: ~4 weeks to TestFlight if focused.**
