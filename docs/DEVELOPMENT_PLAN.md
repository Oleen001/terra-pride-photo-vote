# Terra Pride Photo Vote - Development Plan

## Recommended Stack

- Framework: Next.js App Router
- Language: TypeScript
- Styling: Tailwind CSS
- Database: Supabase Postgres
- Auth: Supabase email OTP or custom OTP with email provider
- Storage: Supabase Storage
- Hosting: Vercel

Supabase is recommended because it covers OTP auth, Postgres, row-level data rules, and image storage in one product. This keeps the MVP small and reduces backend setup time.

## High-Level Architecture

```text
Next.js App
  Public Gallery
  Participant Upload
  Participant Voting
  Admin Dashboard

Supabase
  Auth / OTP
  Postgres
  Storage Bucket

Environment Variables
  Supabase keys
  Admin email
  Admin password hash
```

## Suggested Routes

```text
/
/login
/upload
/admin/login
/admin
/admin/photos
/admin/whitelist
/admin/settings
```

## Phase 1 - Project Setup

Tasks:

- Create Next.js app with TypeScript.
- Install Tailwind CSS.
- Set up base app layout.
- Add environment variable template.
- Add Supabase client utilities.
- Add shared UI primitives:
  - button
  - input
  - textarea
  - modal or drawer
  - image card
  - loading state
  - error state

Deliverable:

- App runs locally.
- Basic routes exist.
- Styling foundation is ready.

## Phase 2 - Supabase Schema

Tasks:

- Create database tables:
  - users
  - whitelist_emails
  - photos
  - votes
  - app_settings
- Add unique vote constraint:

```text
unique(user_id, photo_id)
```

- Add indexes:
  - `photos.owner_user_id`
  - `photos.is_deleted`
  - `votes.photo_id`
  - `votes.user_id`
  - `whitelist_emails.email`
- Create default app settings row.
- Create storage bucket:
  - `photos`

Deliverable:

- Database supports auth, upload, voting, soft delete, and admin summary.

## Phase 3 - Authentication

Tasks:

- Build `/login`.
- Participant enters email.
- Check whitelist before OTP.
- Send OTP.
- Verify OTP.
- Create or update local user record after successful login.
- Store session.
- Add logout.
- Protect upload and voting actions.

Admin tasks:

- Build `/admin/login`.
- Validate `ADMIN_EMAIL`.
- Validate password against `ADMIN_PASSWORD_HASH`.
- Store admin session separately.
- Protect all `/admin/*` routes.

Deliverable:

- Whitelisted users can log in.
- Non-whitelisted users cannot enter.
- Admin can log in separately.

## Phase 4 - Gallery

Tasks:

- Build homepage `/` as gallery.
- Query active photos only.
- Show image, caption, owner email, and voted state.
- Hide vote count while `revealResultsOpen` is false.
- Add responsive image grid or masonry layout.
- Add motion:
  - entrance animation
  - hover/tap effect
  - vote state feedback
- Add empty state.

Deliverable:

- Homepage is a complete visual gallery and can be used as the main product surface.

## Phase 5 - Upload

Tasks:

- Build `/upload`.
- Require login.
- Check `uploadOpen`.
- Validate:
  - one file only
  - caption required
  - file size <= 20MB
  - supported file type
- Enforce maximum 5 active uploaded photos per participant.
- Upload image to storage.
- Create photo row.
- Automatically create owner's vote for the new photo.
- Redirect back to gallery after success.
- Add error handling for file type, size, storage failure, and closed upload.

Deliverable:

- Participant can upload 1 photo with caption.
- Photo appears in gallery immediately.
- Owner vote is created automatically.

## Phase 6 - Voting

Tasks:

- Add vote/unvote action.
- Check login.
- Check `votingOpen`.
- Prevent duplicate votes using database constraint.
- If user votes an unvoted photo, create vote.
- If user unvotes a photo, delete vote.
- If photo owner tries to unvote own photo, block action.
- Keep voted state updated in UI.

Deliverable:

- Participant can vote all photos.
- Participant can unvote other people's photos.
- Participant cannot unvote own photo.

## Phase 7 - Soft Delete

Tasks:

- Let participant delete own photo.
- Set `isDeleted = true`.
- Set `deletedAt`.
- Hide deleted photo from public gallery.
- Keep votes in database.
- Admin can still see deleted photos.

Deliverable:

- User-owned photo deletion works without destroying audit data.

## Phase 8 - Result Reveal

Tasks:

- Add `revealResultsOpen` setting.
- When closed:
  - hide vote count
  - hide ranking
- When open:
  - show public Top 10
  - show vote count
  - sort by vote count descending
  - tie-break by earlier upload time

Deliverable:

- Admin can reveal or hide result manually.
- Public users see Top 10 only after reveal.

## Phase 9 - Admin Dashboard

Tasks:

- Build dashboard summary.
- Build settings toggles:
  - upload open
  - voting open
  - reveal results open
- Build whitelist management:
  - list emails
  - add email
  - remove email
- Build photo management:
  - list all photos
  - include active and soft-deleted
  - show owner, caption, vote count
  - soft delete
  - restore

Deliverable:

- Admin can operate the event without developer help.

## Phase 10 - QA And Polish

Functional checks:

- Non-whitelisted email cannot log in.
- Whitelisted email can receive OTP and log in.
- Upload closed blocks upload.
- Upload accepts valid photo under 20MB.
- Upload rejects invalid file or over-20MB file.
- Upload blocks the 6th active photo for the same participant.
- Upload creates owner vote.
- User can vote all photos.
- User cannot vote same photo twice.
- User can unvote other photos.
- User cannot unvote own photo.
- Voting closed blocks vote/unvote.
- Soft-deleted photo disappears from gallery.
- Reveal closed hides counts and ranking.
- Reveal open shows Top 10.
- Admin settings update correctly.

UI checks:

- Desktop gallery looks polished.
- Mobile gallery is usable.
- Captions do not overflow.
- Owner email does not break layout.
- Loading state appears during upload/vote.
- Error messages are clear.
- Animations respect reduced-motion preference.

## Environment Variables

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ADMIN_EMAIL=
ADMIN_PASSWORD_HASH=
```

Optional:

```text
NEXT_PUBLIC_SITE_URL=
```

## Implementation Notes

- Prefer server actions or route handlers for protected writes.
- Never trust client-side ownership checks alone.
- Validate upload file size and type on the server.
- Store image URLs and storage paths separately if deletion or migration may be needed.
- Use soft delete for photos instead of hard delete.
- Use database constraints for vote uniqueness.
- Use admin-only server-side logic for dashboard vote counts.
- Keep public queries from returning vote counts unless reveal is open.

## Suggested Build Order

1. Scaffold app.
2. Add Supabase config.
3. Add schema migration.
4. Add login and session handling.
5. Add gallery read path.
6. Add upload path.
7. Add auto-vote.
8. Add vote/unvote.
9. Add soft delete.
10. Add admin login.
11. Add admin settings.
12. Add admin whitelist.
13. Add admin photo management.
14. Add reveal Top 10.
15. Polish and QA.

## MVP Completion Criteria

The MVP is ready when:

- Participants can log in with whitelisted email OTP.
- Participants can upload one photo with caption.
- Uploaded photos appear immediately.
- Owner auto-vote is created and cannot be removed by owner.
- Participants can vote every active photo once.
- Vote counts are hidden before reveal.
- Top 10 appears only after admin reveal.
- Admin can manage settings, whitelist, and photos.
- Mobile and desktop gallery are visually polished and stable.
