# Terra Pride Photo Vote - Requirements

## Overview

Terra Pride Photo Vote is a private photo voting website. Only whitelisted email addresses can join. Participants can upload photos, write captions, browse the shared gallery, and vote on any photo. Voting results are hidden from participants until an admin manually reveals the Top 10.

## Goals

- Let invited participants join using email OTP authentication.
- Let participants upload photo entries one at a time with a required caption.
- Make the homepage a visual gallery immediately, with no hero section.
- Let each participant vote for every photo, one vote per photo per email.
- Automatically vote for the owner's own uploaded photo.
- Hide vote counts and ranking until admin reveal.
- Provide an admin dashboard for monitoring, settings, whitelist, and photo management.

## User Roles

### Participant

- Logs in with whitelisted email and OTP.
- Uploads photos.
- Views gallery.
- Votes or unvotes photos.
- Deletes their own uploaded photos.

### Admin

- Logs in through a separate admin login.
- Manages whitelist emails.
- Monitors photos, votes, and users.
- Soft deletes or restores photos.
- Controls upload, voting, and result reveal manually.

## Authentication Requirements

- Participant login uses email OTP.
- Email must exist in the whitelist before OTP can be requested or verified.
- OTP should expire after a short period, recommended 10 minutes.
- OTP should be single-use.
- User identity is email only.
- No display name is required.
- Admin login is separate from participant login.
- Recommended admin credentials:
  - `ADMIN_EMAIL`
  - `ADMIN_PASSWORD_HASH`
- Admin password must not be stored as plain text.

## Participant Requirements

- A participant is identified by email.
- Email is shown as the photo owner.
- Participant can upload more than one photo over time.
- Participant uploads only 1 photo per upload action.
- Participant can have up to 5 active uploaded photos.
- Participant can delete their own photo.
- Deleting a photo is a soft delete.

## Photo Upload Requirements

- Upload is available only when `uploadOpen` is enabled by admin.
- Upload requires authentication.
- Upload accepts 1 photo per submission.
- Caption is required.
- Maximum image size is 20MB.
- Supported formats:
  - `jpg`
  - `jpeg`
  - `png`
  - `webp`
- Optional but recommended:
  - support `heic` or show a clear unsupported-file message for iPhone HEIC photos.
- Uploaded photos appear in the gallery immediately.
- No approval workflow.
- After a successful upload, the system automatically creates a vote from the owner for that photo.
- Owner auto-vote is always enabled.
- Owner should not be able to unvote their own photo.

## Gallery Requirements

- Homepage `/` is the gallery.
- No hero section.
- No filter.
- Gallery shows active photos only.
- Soft-deleted or hidden photos do not appear in the public gallery.
- Gallery should be visually impressive and image-first.
- Recommended layout:
  - responsive masonry grid or responsive image grid.
- Recommended animation:
  - image entrance animation
  - hover/tap transition
  - vote feedback animation
  - photo detail/modal transition
- Each photo item should show:
  - image
  - caption
  - owner email
  - user's voted state
- Before reveal, vote counts must not be shown to participants.
- Before reveal, ranking must not be shown to participants.

## Voting Requirements

- Voting is available only when `votingOpen` is enabled by admin.
- A participant can vote for any active photo.
- If there are 50 photos, a participant can vote for all 50 photos.
- One email can vote only once per photo.
- Vote uniqueness must be enforced at the database level.
- Required unique constraint:

```text
unique(userId, photoId)
```

- Participant can unvote photos they do not own.
- Participant cannot unvote their own uploaded photo.
- Vote count is tied to each photo, not to the owner.
- Votes for soft-deleted photos remain stored for audit and admin visibility.

## Result Reveal Requirements

- Result visibility is controlled manually by admin.
- Before reveal:
  - participants do not see vote count
  - participants do not see ranking
  - participants can see only their own voted state
- After reveal:
  - public Top 10 is shown
  - each ranked photo shows vote count
  - each ranked photo shows caption
  - each ranked photo shows owner email
- Ranking is based on vote count per photo.
- Recommended tie-breaker:
  - higher vote count first
  - if tied, earlier uploaded photo ranks higher

## Admin Dashboard Requirements

### Admin Login

- Separate route, recommended `/admin/login`.
- Login with fixed admin email and password.
- Password validation should use a hash from environment variables.

### Summary

Admin dashboard should show:

- total photos
- active photos
- soft-deleted photos
- total votes
- whitelist email count
- participant count or users who have logged in

### Settings

Admin can manually toggle:

- upload open/closed
- voting open/closed
- results reveal open/closed

### Whitelist Management

Admin can:

- add email
- remove email
- view whitelist emails

CSV import/export is out of scope for MVP.

### Photo Management

Admin can:

- view all photos, including soft-deleted photos
- view image
- view caption
- view owner email
- view vote count
- soft delete photo
- restore photo

### Export

- Export is not required for MVP.

## Data Model

### users

```text
id
email
createdAt
lastLoginAt
```

### whitelist_emails

```text
id
email
createdAt
```

### otp_codes

```text
id
email
codeHash
expiresAt
usedAt
createdAt
```

### photos

```text
id
ownerUserId
imageUrl
thumbnailUrl
caption
isDeleted
deletedAt
createdAt
updatedAt
```

### votes

```text
id
userId
photoId
createdAt
```

Required constraint:

```text
unique(userId, photoId)
```

### app_settings

```text
uploadOpen
votingOpen
revealResultsOpen
```

## MVP Scope

- OTP email login with whitelist check.
- Homepage gallery.
- Upload 1 image with required caption.
- Image size validation up to 20MB.
- Maximum 5 active uploaded photos per participant.
- Auto-vote own uploaded photo.
- Vote/unvote other photos.
- Prevent owner from unvoting own photo.
- Soft delete own photo.
- Admin login.
- Admin settings toggles.
- Admin whitelist management.
- Admin photo management.
- Public Top 10 after reveal.

## Out Of Scope For MVP

- Photo approval workflow.
- Hero section.
- Gallery filters.
- User display names.
- Ranking before reveal.
- CSV export.
- CSV whitelist import.
- Scheduled reveal time.
- Multiple photo upload in one action.
- Public total ranking beyond Top 10.
