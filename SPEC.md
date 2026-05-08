# Rally — Product Specification

The complete product. Every screen, every flow, every edge case.

---

## Product summary

Rally is an iOS app that connects to a user's calendar, finds times when they and a nearby tennis player are both free, and books the match. The event lands in both calendars automatically. No texting, no back-and-forth.

The bottleneck in recreational sport is coordination, not discovery. Rally removes it entirely with calendar sync.

---

## Tech stack

- Frontend: Expo SDK 51+ (managed workflow), TypeScript, Expo Router
- Backend: Supabase (Postgres, Auth, Realtime, Edge Functions, Storage)
- Calendar: `expo-calendar` (Apple), Google Calendar API
- Maps: `@rnmapbox/maps`
- Server state: TanStack Query
- Client state: Zustand
- Forms: react-hook-form + Zod
- Notifications: expo-notifications (APNs)
- Payments: Stripe (transaction fees, future Pro subscriptions)
- Analytics: PostHog
- Errors: Sentry
- Testing: Vitest, React Native Testing Library, Maestro
- Date utils: date-fns
- Secure storage: expo-secure-store

iOS first. Android comes later from the same Expo codebase.

---

## Data model

```sql
-- Profiles extends auth.users
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text not null,
  avatar_url text,
  city text,
  utr_rating numeric check (utr_rating between 1 and 16),
  preferred_sport text default 'tennis',
  preferred_hours jsonb default '{"weekday_morning":false,"weekday_evening":true,"weekend":true}',
  home_court_id uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Privacy-safe free/busy intervals only (NEVER store event content)
create table availability_blocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  start_time timestamptz not null,
  end_time timestamptz not null,
  source text not null check (source in ('apple','google')),
  synced_at timestamptz default now(),
  check (end_time > start_time)
);

create index on availability_blocks (user_id, start_time);

create table schedule_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references profiles(id) on delete cascade,
  recipient_id uuid not null references profiles(id) on delete cascade,
  status text default 'pending' check (status in ('pending','accepted','declined','expired','cancelled')),
  message text,
  created_at timestamptz default now(),
  expires_at timestamptz default (now() + interval '48 hours'),
  responded_at timestamptz,
  check (requester_id <> recipient_id)
);

create table matches (
  id uuid primary key default gen_random_uuid(),
  player_a uuid not null references profiles(id),
  player_b uuid not null references profiles(id),
  start_time timestamptz not null,
  end_time timestamptz not null,
  court_id uuid references courts(id),
  court_fee_cents integer,
  status text default 'upcoming' check (status in ('upcoming','completed','cancelled')),
  apple_event_id_a text,
  apple_event_id_b text,
  google_event_id_a text,
  google_event_id_b text,
  schedule_request_id uuid references schedule_requests(id),
  created_at timestamptz default now(),
  completed_at timestamptz,
  cancelled_at timestamptz,
  cancelled_by uuid references profiles(id),
  check (end_time > start_time),
  check (player_a <> player_b)
);

create table courts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  latitude numeric not null,
  longitude numeric not null,
  city text,
  hours jsonb,
  court_count integer default 1,
  fee_per_hour_cents integer,
  surface text,
  indoor boolean default false
);

create index on courts using gist (
  ll_to_earth(latitude, longitude)
);

create table match_reviews (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id) on delete cascade,
  reviewer_id uuid not null references profiles(id),
  rating integer check (rating between 1 and 5),
  no_show boolean default false,
  created_at timestamptz default now(),
  unique (match_id, reviewer_id)
);
```

All tables have RLS enabled with policies as defined in RULES.md.

---

## Screens

### 1. Splash & Auth

**Purpose:** Entry. Sign in or sign up.

**Elements:**

- Rally wordmark, tagline ("Schedule sport in one tap")
- Continue with Apple (primary)
- Continue with Google
- Continue with Email
- Privacy + Terms link footer

**States:**

- Initial, loading, error (network, cancelled, invalid creds)
- Routes: success → onboarding (new user) or hub (returning)

### 2. Onboarding (5 steps)

**Purpose:** Collect minimum to make scheduling work.

**Step 1 — Gender:** Male / Female / Prefer not to say
**Step 2 — Skill:** UTR slider 1–16 with anchor labels (Beginner, Intermediate, Advanced, Pro), "I don't know my UTR" option
**Step 3 — Location:** Auto-detect via expo-location, or manual city search
**Step 4 — Calendar:** Connect Apple, Google, both, or skip. Two-prompt flow: read first.
**Step 5 — Preferred hours:** Chips for Weekday morning, Weekday evening, Weekend, Anytime

**Elements:**

- Progress dots top
- Back arrow (except step 1)
- Continue CTA bottom
- Skip option only on calendar step

**States:** Loading per step, error, completion → Hub

### 3. Scheduling Hub (home tab)

**Purpose:** Primary screen. See your free windows and find players.

**Elements:**

- Header: "Schedule a match" + city editor pencil
- "Your free windows" — 3–5 cards showing next free blocks
- "Players nearby" — ranked by mutual overlap score
- Filter chip: skill range slider
- Pull to refresh syncs calendar

**States:**

- Empty (calendar not connected): "Connect your calendar to find players" + CTA
- Empty (no players): "No players in your area yet. Try expanding your search radius."
- Loading skeleton, error toast on sync failure

### 4. Player Profile Sheet (bottom sheet from Hub)

**Purpose:** Quick view before scheduling.

**Elements:**

- Avatar, full name, UTR badge, distance, home court
- Mutual overlap count
- Sample mutual slots (top 3)
- "Schedule a match" primary CTA
- Optional message field

### 5. Mutual Availability Picker

**Purpose:** See only times you are both free. Pick one.

**Elements:**

- Header: opponent avatar + name
- Toggle: This week / Next 14 days
- List of mutual free slots: day, time, duration (minimum 90 min)
- Continue CTA (disabled until selection)

**States:**

- Zero overlap: "No mutual times in the next 7 days" + "Try 14 days" CTA
- All slots short: "Free windows are too short for a full match" + suggest adjusting preferred hours

### 6. Confirm & Book

**Purpose:** Final review before writing to calendars.

**Elements:**

- Match summary card: when, duration, opponent, court, fee
- Calendar event preview (mimics native iOS event)
- "Book and add to calendar" primary CTA
- Cancel button

**States:**

- Re-validation runs on mount; if slot no longer free, show error and route back to picker

### 7. Booked confirmation

**Purpose:** Reassure user the match is real and on both calendars.

**Elements:**

- Success check icon (animated, 250ms)
- Match summary
- Two calendar event preview cards (yours + opponent's)
- "View in Calendar" deep link
- "Done" returns to Hub

### 8. Matches Tab

**Purpose:** All your matches.

**Sub-tabs:** Upcoming / Past / Pending

**Upcoming card:** opponent avatar, time, court, synced badge
**Past card:** opponent, time, score (if entered), rematch CTA, review CTA
**Pending card:** Incoming request → Accept / Decline buttons. Outgoing request → status + cancel option

### 9. Courts Tab (Mapbox)

**Purpose:** Discover courts and set home court.

**Elements:**

- Mapbox map with traffic-colored markers (Open, Filling, Full)
- User location pin
- Search bar
- List view sorted by distance
- Court detail bottom sheet: name, address, hours, fees, surface, court count, "Set as home court"

### 10. Profile Tab

**Purpose:** Identity, settings, calendar permissions.

**Sections:**

- Profile card: avatar, name, UTR, edit
- Home court (read-only with edit link)
- Calendar Permissions panel: Apple ✓ Connected (last sync 2m ago, revoke), Google ✓ Connected
- Preferred play hours editor
- Notifications toggle
- Privacy & data
- Sign out

---

## Core flows

### First-time user

1. Splash → Sign in
2. Onboarding 5 steps
3. Land on Hub with welcome state

### Returning user — happy path scheduling

1. Open app → Hub loads, free windows refresh from calendar
2. Tap nearby player → Profile sheet
3. Tap "Schedule a match" → request created, push fires to recipient
4. Recipient opens app → sees pending request banner
5. Recipient opens Mutual Availability Picker
6. Recipient picks slot → Confirm & Book
7. Recipient confirms → match created, calendar events written, push to requester
8. Requester sees Booked confirmation on next open
9. Match in Upcoming tab with synced badge

### Post-match flow

1. 24h before: push reminder
2. 15min before: push with court address + directions deep link
3. After end_time: prompt to mark complete + rate
4. Match moves to Past, rematch CTA shown

---

## Edge cases

### Calendar

- Permission denied → fall back to manual time entry, explainer banner
- Permission revoked mid-session → modal on next foreground asking to re-grant
- Zero events in calendar → treat as fully available
- All-day events → mark full day unavailable
- Overlapping events → de-duplicate before computing free intervals
- Multiple calendars (Apple + Google) → merge busy intervals
- Calendar source removed (e.g. work account deleted) → drop those blocks on next sync

### Scheduling

- Zero mutual slots in 7 days → empty state with "Try 14 days" CTA
- Mutual slot shorter than 90 min → filter out
- Request not responded to in 48h → auto-expire via cron Edge Function
- Slot conflicts after acceptance (other player's calendar filled it) → re-validate on Confirm screen, route back to picker with toast
- Both players confirm same slot simultaneously → server-side advisory lock, last write loses with friendly error

### Calendar write-back

- Write fails (permission revoked between read and write) → save match record, show retry banner, allow user to re-grant
- Match cancelled → delete events on both sides; if delete fails, leave note in event description
- Match time edited → update both events; if either fails, surface in Matches tab

### Network

- Offline at app open → show cached free windows + matches, disable scheduling with banner
- Multi-device sync → Supabase realtime channels keep matches and requests in sync
- Push notifications disabled → in-app red dot on Matches tab for pending requests

### Privacy

- Test asserts no availability_blocks row contains anything beyond user_id + timestamps
- UI never renders strings sourced from raw calendar events

---

## Push notification triggers

| Event                | Audience     | Timing       |
| -------------------- | ------------ | ------------ |
| New schedule request | Recipient    | Immediate    |
| Request accepted     | Requester    | Immediate    |
| Request declined     | Requester    | Immediate    |
| Request expired      | Requester    | At 48h       |
| Match reminder       | Both         | 24h before   |
| Match starting soon  | Both         | 15min before |
| Match cancelled      | Other player | Immediate    |

All payloads include a deep link to the relevant screen.

---

## Analytics events (PostHog)

Funnel events only:

- `signed_up`
- `onboarding_completed`
- `calendar_connected` (with provider)
- `first_availability_synced`
- `request_sent`
- `request_accepted`
- `match_confirmed`
- `match_completed`

Never log calendar content, message content, or PII.
