# App 2 — Vinted Lister (Flutter/iOS) — Plan

Status: DRAFT — awaiting confirmation before repo creation / any code.

## Summary

Native iOS (Flutter/Dart) port of this web app, full v1 feature parity. New,
independent repo (`vinted-lister-app`). Applies Kindred (App 1) retrospective
lessons directly rather than repeating them. Backend added this time, scoped
to cross-device sync/backup only — AI stays client-side (BYOK), matching the
web app's model.

## Decisions locked in

| Decision | Choice |
|---|---|
| Repo | New standalone: `vinted-lister-app` |
| Platform v1 | iOS only, Android-ready structure |
| Scope v1 | Full parity with web app (photos → AI analysis → edit → copy-to-Vinted, statuses) |
| State management | Riverpod (Kindred used setState; explicitly would choose Riverpod if starting over) |
| DI | `AppDeps` bundle from day one — abstract repo interfaces, no direct `FirebaseX.instance` calls from widgets |
| Backend | Firebase — new project(s), separate from Kindred's (`kindred-staging-f65cb`/`kindred-prod-762dc`) |
| Backend purpose | Cross-device sync/backup only — no AI proxying |
| AI calls | Stay client-side, BYOK Anthropic key, same model/prompt logic as web app |
| Auth | Sign in with Apple only (v1) |
| Bundle ID | `com.kindredhome.vintedlister` (prod) / `com.kindredhome.vintedlister.staging` (iOS staging only, no Android staging bundle — matches Kindred's convention) |
| CI/CD | GitHub Actions (lint/test gates) + Codemagic (dashboard-configured, no in-repo `codemagic.yaml`) → TestFlight/App Store via ASC API key, Automatic signing. No fastlane. |

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
  services/        # cross-cutting: ai_client (Anthropic), active_session, friendly_error
  app_deps.dart    # single DI bundle, constructed once in main.dart
functions/         # minimal — only if a Cloud Function ends up needed (see Open Questions)
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
  secrets. The Anthropic API key itself stays local-only in
  `flutter_secure_storage`, never written to Firestore — it's BYOK and Kindred's
  own model treats it as too sensitive to sync in plaintext.
- **Concurrent-safe fields**: any array field a background sync could touch
  concurrently (e.g. `colours`, `materials` if ever multi-write) uses
  `arrayUnion`/`arrayRemove`, not read-modify-write.
- **Optimistic lock**: `updatedAt` timestamp compared before overwriting on
  reconnect-sync, per Kindred's pattern.
- **Transactional writes**: if any write needs `runTransaction` (e.g. a
  guarded status change), the UI must NOT show an optimistic "saved — will
  sync" state for it — transactions aren't offline-queued in Firestore,
  unlike plain `.set()`/`.update()`. Kindred shipped this exact bug once.

## AI analysis (ported, not redesigned)

- Same prompt-building logic as `analysis.js` (`buildAnalysisPrompt()`,
  persona + rules from settings), same JSON schema, same model call — ported
  to Dart 1:1, not reinvented.
- Smart-crop: web app uses TF.js + COCO-SSD in-browser. No direct Dart/Flutter
  equivalent — **open question**, see below.

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
- Codemagic: two workflows (staging bundle / prod bundle), dashboard-configured,
  ASC API key with Admin access, Automatic signing.
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
2. **Existing web app users' data**: is there any need to import/migrate
   existing items from the web app's IndexedDB into the new Firebase-backed
   app, or does App 2 start with an empty item list? (Web app has no
   accounts today, so there's no automatic user-identity link between the
   two.)
3. **Firebase project names/region**: propose `vinted-lister-staging` /
   `vinted-lister-prod`, same region as Kindred (`europe-west2`) for
   consistency — confirm or change.
4. Confirm your Kindred org identifier is literally `kindredhome` (inferred
   from `com.kindredhome.app`) before I use it in the bundle ID.

## Next steps (once this plan is confirmed)

1. Create `vinted-lister-app` GitHub repo.
2. Scaffold Flutter project, `AppDeps`, Riverpod, empty repositories.
3. Set up Firebase projects (staging/prod) — dashboard-side, owner-driven
   (per Kindred's own rule: no pasting long-lived secrets into chat).
4. Port data model + AI client.
5. Build UI screens in order: home → add-photos → detail → copy-flow → settings.
6. Wire CI (GitHub Actions) + Codemagic.
7. TestFlight internal build.
