# App 2 — Vinted Lister (Flutter/iOS) — Plan

Status: DRAFT — awaiting confirmation before repo creation / any code.

## Summary

Native iOS (Flutter/Dart) port of this web app, full v1 feature parity. New,
independent repo (`vinted-lister-app`). Applies Kindred (App 1) retrospective
lessons directly rather than repeating them. Backend added this time:
cross-device sync/backup, PLUS (revised — see below) a server-proxied AI
call with a free monthly allowance and a paywall to raise it. This is a
deliberate departure from the web app's BYOK model.

## Decisions locked in

| Decision | Choice |
|---|---|
| Repo | New standalone: `vinted-lister-app` |
| Platform v1 | iOS only, Android-ready structure |
| Scope v1 | Full parity with web app (photos → AI analysis → edit → copy-to-Vinted, statuses) |
| State management | Riverpod (Kindred used setState; explicitly would choose Riverpod if starting over) |
| DI | `AppDeps` bundle from day one — abstract repo interfaces, no direct `FirebaseX.instance` calls from widgets |
| Backend | Firebase — single project `vinted-lister-prod`, separate from Kindred's. No staging project — everything on prod. |
| Backend purpose | Cross-device sync/backup + server-proxied AI calls + usage/entitlement enforcement |
| AI calls | Server-proxied via Cloud Function (callable). Anthropic key lives in Firebase Secret Manager, never on-device. No BYOK. |
| Free tier | 2 AI analyses / month per user, enforced server-side |
| Paywall | RevenueCat (`purchases_flutter`), same as Kindred — monthly + annual plans, 14-day free trial on annual only. Subscription raises the monthly analysis limit. |
| Existing data | None migrated — App 2 starts with an empty item list (web app has no accounts, no user-identity link to carry over) |
| Auth | Sign in with Apple only (v1) |
| Bundle ID | `com.kindredhome.vintedlister` (single, no staging variant) |
| CI/CD | GitHub Actions (lint/test gates) + Codemagic (dashboard-configured, no in-repo `codemagic.yaml`), single workflow → TestFlight/App Store via ASC API key, Automatic signing. No fastlane. |

## Folder structure (mirrors Kindred, feature-first UI / layer-first data)

```
lib/
  data/            # repositories + models — the Firestore seam
    item_repository.dart (abstract) + firestore_item_repository.dart
    photo_repository.dart (abstract) + firebase_storage_photo_repository.dart
    settings_repository.dart (abstract) + firestore_settings_repository.dart
    auth_repository.dart (abstract) + firebase_auth_repository.dart
  ui/
    home/          # item list, filters
    add_photos/    # camera/library capture, slot grid, smart-crop
    detail/        # item detail, edit fields
    copy/          # copy-to-Vinted step 1/2/3 flow
    settings/      # API key entry, persona/rules, smart-crop toggle, photo mode
    theme/
    widgets/
  services/        # cross-cutting: active_session, friendly_error
  app_deps.dart    # single DI bundle, constructed once in main.dart
functions/src/
  ai/              # ported analysis prompt/schema/parsing logic (TS) — callable AI-proxy function
  billing/         # RevenueCat webhook handler — updates entitlement doc
  usage/           # monthly usage-counter check + increment (shared by ai/ function)
```

## Data model (Firestore)

Port the existing `items` IndexedDB schema to per-user Firestore collection
`users/{uid}/items/{itemId}`:
```
id, status, hasPhotos, title, description, category, brand, size, condition,
colours[], materials[], createdAt, statusChangedAt, updatedAt   // optimistic-lock field
```
- **Archived status**: web app is actively removing `archived` (Sprint E, #46,
  in progress on `dev`) — App 2 launches without it; don't port a status the
  source of truth is deleting.
- **Photos**: NOT embedded as base64 in Firestore docs (1 MiB doc cap, cost).
  Store files in Cloud Storage for Firebase at `users/{uid}/items/{itemId}/{n}.jpg`,
  reference by storage path in the item doc. Thumbnail can stay a small
  downsized copy in Storage too, fetched via `cached_network_image` (proven
  in Kindred) rather than inline base64.
- **Settings**: `users/{uid}/settings` doc for persona/rules text, smart-crop
  toggle, photo mode preference — these sync across devices since they're not
  secrets. No client-held Anthropic key at all now — the key lives only in
  Firebase Secret Manager, read by the Cloud Function.
- **Usage**: `users/{uid}/usage` doc — `{count, periodStart}`. Checked and
  incremented inside the same Cloud Function call that proxies the Anthropic
  request (atomic — no separate client-side increment to race or spoof).
  Resets when `periodStart` rolls past a month; no scheduled job needed if
  the check-on-read compares against "now" rather than relying on a cron reset.
- **Entitlement**: `users/{uid}/entitlement` doc — mirrors the Kindred
  pattern (`tier/Premium is a Firestore doc, not a token claim`). Updated by
  the RevenueCat webhook Cloud Function, read (never trusted from the client)
  by the AI-proxy function to decide the user's monthly limit.
- **Concurrent-safe fields**: any array field a background sync could touch
  concurrently (e.g. `colours`, `materials` if ever multi-write) uses
  `arrayUnion`/`arrayRemove`, not read-modify-write.
- **Optimistic lock**: `updatedAt` timestamp compared before overwriting on
  reconnect-sync, per Kindred's pattern.
- **Transactional writes**: if any write needs `runTransaction` (e.g. a
  guarded status change), the UI must NOT show an optimistic "saved — will
  sync" state for it — transactions aren't offline-queued in Firestore,
  unlike plain `.set()`/`.update()`. Kindred shipped this exact bug once.

## AI analysis (server-proxied, not client-side)

- Same prompt-building logic as `analysis.js` (`buildAnalysisPrompt()`,
  persona + rules from settings) and same JSON schema — ported to
  **TypeScript** in `functions/src/ai/`, not Dart, since the call now
  originates server-side. The Flutter client calls a Firebase callable
  function (photos + persona/rules in, parsed JSON out); it never talks to
  Anthropic directly.
- The callable function, in order: verify Firebase Auth token → read
  `entitlement` doc → read/check/increment `usage` doc (free limit vs.
  subscriber limit) → reject with a "limit reached" error if over quota →
  call Anthropic with the Secret-Manager-held key → return parsed result.
- Cloud Function reading the Anthropic key must declare it in `secrets:[...]`
  in the function's options (Kindred convention — a real key silently not
  injected is a production outage, not a build error).
- Smart-crop: web app uses TF.js + COCO-SSD in-browser. No direct Dart/Flutter
  equivalent — **open question**, see below.

## Paywall & monetization

- `purchases_flutter` (RevenueCat), same as Kindred. Two products: monthly,
  annual. **14-day free trial on the annual product only** (App Store Connect
  introductory offer) — monthly has no trial.
- Free tier: 2 AI analyses/month, no subscription required. Any active
  subscription raises the monthly limit (exact subscriber cap: TBD — see
  open questions).
- Entitlement source of truth is the Firestore `entitlement` doc (webhook-
  updated), not the RevenueCat SDK's local cache and not a Firebase Auth
  custom claim — matches Kindred's pattern exactly.
- Known integration tax from Kindred, budget time for all three:
  - ASC API keys are per-purpose and not interchangeable (the key for
    RevenueCat's App Store Server Notifications is not the same as the
    ASC key Codemagic uses).
  - RevenueCat webhook auth is a literal-string match on a header value —
    NOT an `Authorization: Bearer <secret>` scheme. Easy to misconfigure.
  - RevenueCat sandbox/test events use a fake `app_user_id` that 500s on
    the webhook handler unless it's explicitly seeded in Firestore first.

## Auth & security rules

- Sign in with Apple only, native (`sign_in_with_apple` package) — no `kIsWeb`
  branch needed since this is iOS-only.
- Firestore security rules: every doc read/write scoped to `request.auth.uid
  == resource.data.ownerId` (or path-scoped under `users/{uid}/...`, simpler
  and avoids the invariant-in-rules problem Kindred hit — no cross-user
  documents to worry about at all, since this app has no household/sharing
  concept).

## CI/CD

- GitHub Actions: lint + widget tests + (new, per lesson #14) an
  `integration_test/` layer stood up from the start rather than retrofitted.
  `paths-ignore` for doc-only diffs from day one (Kindred added this after
  burning CI budget).
- Codemagic: single workflow (prod bundle only, no staging split),
  dashboard-configured, ASC API key with Admin access, Automatic signing.
- Pre-empt known process pitfalls from day one rather than rediscovering them:
  - git-proxy 403s on tag pushes / slug pushes → use workflow-dispatch
    server-side tag creation, PR+REST-merge instead of direct fast-forward push.
  - Shallow-clone false "divergence" alarms → check `.git/shallow` before
    trusting `git cherry`/`merge-base` output.
  - Rules/Functions deploy drift with no CI signal → a deploy-queue ledger
    from the start, not after an incident.
  - Sub-agents (if used) are code-only; a single parent process owns shared
    ledger files (CHANGELOG, decisions log, todo, smoke tests) — never let
    parallel/worktree agents write those.
- Release: bump minor version before cutting a new ASC pre-release train if a
  previous train under the same version already reached App Review (error
  90186 otherwise).
- If push notifications are ever added: `aps-environment` must be
  `production` for any App-Store-signed (TestFlight/App Store) build —
  `development` silently kills push registration with no error, easy to
  misdiagnose as a timing race.

## Testing

- Widget tests for UI, same weight as Kindred.
- Unlike Kindred's gap: stand up `integration_test/` for the
  photos→analyse→edit→copy flow from the start — this is exactly the class of
  bug (navigation-stack, cross-screen state) widget tests structurally miss.
- `GoogleFonts.config.allowRuntimeFetching = false` in test setup if
  `google_fonts` is used, to avoid silent test-hang from live HTTP fetch.

## Open questions (need answers before or during build, not blocking the plan doc itself)

1. **Smart-crop on Flutter**: no direct TF.js/COCO-SSD equivalent. Candidates:
   `google_mlkit_object_detection` (on-device, Google ML Kit) or shipping v1
   without smart-crop (centre-crop only, same fallback the web app already
   has) and adding it in a fast-follow. Recommend: ship v1 with centre-crop
   only, add ML Kit smart-crop as a fast-follow — avoids blocking the whole
   port on an unproven dependency.
2. **Subscriber monthly limit**: free tier is 2/month — what should the
   subscriber cap be (a specific number, or unlimited)? Needed for the
   usage-check logic in the Cloud Function.

~~3. Firebase project name/region~~ — resolved: single project
`vinted-lister-prod`. Region: proposing `europe-west2` (same as Kindred) for
consistency — flag if you want a different region.

~~4. Kindred org identifier~~ — resolved: `kindredhome` (confirmed via
`kindredhome.app`). Bundle ID: `com.kindredhome.vintedlister`.

## Next steps (once this plan is confirmed)

1. Create `vinted-lister-app` GitHub repo.
2. Scaffold Flutter project, `AppDeps`, Riverpod, empty repositories.
3. Set up the `vinted-lister-prod` Firebase project — dashboard-side,
   owner-driven (per Kindred's own rule: no pasting long-lived secrets into
   chat). Add Anthropic key to Secret Manager.
4. Set up RevenueCat products (monthly, annual w/ 14-day trial) — dashboard-side.
5. Port data model + build the AI-proxy, usage, and billing-webhook Cloud
   Functions.
6. Build UI screens in order: home → add-photos → detail → copy-flow → settings.
7. Wire paywall UI + entitlement/usage gating in the app.
8. Wire CI (GitHub Actions) + Codemagic (single prod workflow).
9. TestFlight internal build.
