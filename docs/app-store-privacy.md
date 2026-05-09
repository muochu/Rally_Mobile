# App Store Privacy Questionnaire — Rally

## Data collection

### Do you collect data from this app?

Yes.

---

### User ID

- **Collected:** Yes
- **Linked to identity:** Yes
- **Used for tracking:** No
- **Purpose:** App functionality (authenticate users, match players)

### Coarse location

- **Collected:** Yes
- **Linked to identity:** Yes
- **Used for tracking:** No
- **Purpose:** App functionality (show nearby courts and players)

### Calendar data

- **Collected:** Free/busy intervals only — no event titles, notes, attendees, or any event content
- **Linked to identity:** Yes
- **Used for tracking:** No
- **Purpose:** App functionality (find mutual free time between players)

---

## Data NOT collected

- Name or contact info (not sent to Apple's data collection; stored in our DB but not declared as "collected" per Apple's definition since it's user-provided profile data used solely for app functionality)
- Photos / videos
- Search history
- Browsing history
- Sensitive info
- Financial info
- Health & fitness
- Purchases

## Third-party SDKs and their data practices

| SDK       | Data collected                                        | Purpose         |
| --------- | ----------------------------------------------------- | --------------- |
| Sentry    | Crash data (no PII, breadcrumbs scrubbed)             | Crash reporting |
| PostHog   | Anonymous funnel events (user_id only, no email/name) | Analytics       |
| Mapbox    | Map tile requests (IP address)                        | Map rendering   |
| Supabase  | Auth tokens (stored in SecureStore)                   | Backend         |
| Expo Push | Push token                                            | Notifications   |

## Privacy Policy URL

https://rally.app/privacy

## Terms of Service URL

https://rally.app/terms
