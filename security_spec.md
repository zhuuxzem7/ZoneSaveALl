# ZoneSaveALL Firestore Security Specification

## 1. Data Invariants
1. Default-deny catch-all rule (`allow read, write: if false;`) protects all unspecified paths.
2. PII Isolation: `users/{userId}` contains `email` and personal avatar/bio; ONLY the verified owner (`request.auth.uid == userId && request.auth.token.email_verified == true`) can `get` or write their own document. Blanket `list` on `/users` is denied.
3. Master Gate: `/users/{userId}/downloads/{downloadId}` and `/users/{userId}/reports/{reportId}` require parent `/users/{userId}` document existence and strict ownership (`userId == request.auth.uid && incoming().userId == request.auth.uid`).
4. Immutable Fields: `uid`, `createdAt`, `userId`, `id` cannot be modified after creation. Reports are immutable once submitted (`status: 'open'`, no client update).
5. Strict Timestamps: `createdAt` on create and `updatedAt` on create/update MUST equal `request.time`.
6. Strict Key & Type Validation: `keys().hasAll(...)` + `keys().hasOnly(...)` on create, `affectedKeys().hasOnly(...)` on every update action, plus `.size()`, enum allowlists (`collectionFolder`), and regex `^[a-zA-Z0-9_\\-]+$` guards on all IDs and strings.

## 2. Dirty Dozen Adversarial Payloads (Must Return PERMISSION_DENIED)
1. Unauthenticated read of `/users/uid1` -> denied (`request.auth == null`).
2. Authenticated User B reading User A's `/users/uidA` -> denied (PII isolation).
3. Authenticated User A listing `/users` collection -> denied (no `allow list` on `/users`).
4. Unverified email user writing `/users/uidA` -> denied (`email_verified != true`).
5. Shadow field injection (`{ ..., isAdmin: true }`) on `/users/uidA` create -> denied (`keys().hasOnly(...)`).
6. Shadow field injection on `/users/uidA` update -> denied (`affectedKeys().hasOnly(...)`).
7. Identity spoofing (`uid: "otherUid"`) on `/users/uidA` create -> denied (`data.uid == request.auth.uid`).
8. Mutating `createdAt` or `uid` on `/users/uidA` update -> denied (immutability + `affectedKeys`).
9. Client-forged timestamp (`updatedAt: "2020-01-01"`) on `/users/uidA` -> denied (`updatedAt == request.time`).
10. Invalid enum injection (`collectionFolder: "HackedFolder"`) or `autoClipboard: "yes"` -> denied (strict enum & boolean checks).
11. Invalid ID path poisoning (`downloadId` or `reportId` > 128 chars or containing `$` / spaces) -> denied (`isValidId`).
12. Creating `/users/uidA/reports/rep1` with `status: "resolved"` or `description` > 600 chars -> denied (`status == 'open'` & `.size()` bounds).
