# Artist profile media and lightweight availability

## Outcome

Give an approved artist owner or admin a lightweight management mode in `bndy-app` where they can improve the public profile, add external media and publish booking availability without entering the full Backstage product.

The public artist page will make those additions useful immediately through mobile-first, click-to-load media embeds and a clear booking availability section.

## Audit findings

### What already exists

- Artist ownership is represented by `bndy-artist-memberships`. `/api/memberships/me` already returns the current user's artist relationships and roles.
- The canonical artist record already stores `youtubeUrl`, `spotifyUrl`, `publishAvailability`, `availabilityMode`, `contactMethod`, `phoneNumber` and `whatsappNumber`.
- Artist availability dates already use `type: "available"` records in `bndy-events`.
- Existing API operations can toggle a single date, bulk-create dates and return public availability.
- `free_weekends` already derives Friday, Saturday and Sunday dates that do not contain an artist event.
- The public artist page already fetches availability and has a basic availability tab.
- Curators already have a profile edit sheet, but artist owners and admins have no equivalent entry point in `bndy-app`.
- Backstage already exposes the canonical publish mode and booking contact settings.

### Gaps and defects

- The `bndy-app` artist DTO transform drops `availabilityMode`, `contactMethod`, `phoneNumber` and `whatsappNumber`, so existing public contact data cannot render correctly.
- There is no authenticated lightweight read for saved availability while public publishing is off.
- The public free-weekend calculation performs one DynamoDB query per candidate weekend date.
- A single-date availability toggle can mark a date available even when another artist event exists.
- The curator editor does not expose YouTube or Spotify.
- Artist owners and admins have no profile or availability management control.
- Public media links render only as small outbound icons. There are no embedded previews.
- SoundCloud and Bandcamp have no first-class canonical fields.
- The current public availability presentation hides behind a tab and feels like an internal calendar rather than a clean booking surface.

## Ownership and parallel-work boundary

The active Artist and Venue Claiming V2 stream owns:

- claim entry and evidence collection
- Facebook Page proof and corroboration
- claim review states and approval
- creation or correction of entity relationships
- owner conflict and transfer policy

This stream will not edit those flows or contracts. It assumes an approved active relationship already exists.

This stream owns:

- consuming `/api/memberships/me`
- recognising active artist `owner` and `admin` roles in the client
- a narrowly whitelisted owned-artist profile update route
- media and availability editing after association
- public artist media and availability presentation

All work will remain on `feature/artist-media-availability`, which was created from `bndy-app` main at `44cd2fc`. Before publishing, it will be checked again against both current main and `claim-v2-evidence`.

## Product design

### Management entry points

- Show a compact `Manage artist` control on the public artist profile to an authenticated owner or admin.
- Keep curator moderation controls separate. Artist managers never receive Hide or other moderation actions.
- Keep `Your bndy` and claim-management files untouched so the parallel claiming stream can evolve them without conflict.
- Use a mobile bottom sheet with two focused areas: `Profile and media` and `Availability`.

### Profile and media

- Reuse the established artist fields for bio, location, taxonomy and social links.
- Add first-class media inputs for YouTube, Spotify, SoundCloud and Bandcamp.
- Accept external HTTPS links only. There is no media upload, storage, transcoding or autoplay.
- Validate provider hosts in both the client and the owned-profile API.
- Treat YouTube as a featured video link and Spotify or SoundCloud as listen links.
- Preserve ordinary outbound links when a provider URL cannot safely become an embed.

### Public media

- Add a `Listen and watch` section only when supported media exists.
- Use click-to-load embeds so a visitor chooses when third-party players receive a request.
- Support safe embeds for YouTube videos, Spotify content and SoundCloud content.
- Render Bandcamp as a polished provider card unless the stored URL is already a valid official Bandcamp embed URL.
- Use a single-column, full-width layout on mobile with generous tap targets and responsive aspect ratios.
- Never accept an arbitrary iframe source or HTML embed code.

### Lightweight availability editor

- Provide one explicit `Publish availability` control.
- Preserve the two canonical modes:
  - `Pick dates`: tap individual future dates in a simple three-month calendar.
  - `Free weekends`: automatically publish unbooked Friday, Saturday and Sunday dates.
- Show booked dates as unavailable and prevent them being selected.
- Save date taps immediately with clear pending, success and error states.
- Save publishing mode and booking contact settings through the owned-profile endpoint.
- Use the existing E.164 phone input behaviour with the UK as the default country.
- Explain clearly that the selected booking number becomes public when availability is published.
- Keep existing selected-date records when changing modes so switching back is reversible.

### Public availability

- Remove the Events versus Availability tab switch.
- Keep gigs visible as the primary profile content.
- Show a compact `Available to book` module before the gig list when publishing is on.
- Lead with the next available dates in a horizontal mobile rail, with an accessible expansion for later dates.
- Show one preferred booking action based on `contactMethod`, with a safe fallback when the preferred number is absent.
- Show a calm empty state when publishing is on but no dates are currently available.

## API changes

### Artists Lambda

- Add `PATCH /api/artists/{id}/profile`.
- Require authentication and an active `owner` or `admin` membership, with platform admin retained for operations.
- Whitelist only public profile, media and availability setting fields.
- Reuse the existing artist update implementation after authorization and filtering.
- Add `soundcloudUrl` and `bandcampUrl` to artist reads and updates.
- Add YouTube, Spotify, SoundCloud, Bandcamp and availability fields to the curator whitelist where appropriate.
- Validate URL protocol, provider host, string lengths, phone field lengths and enums.
- Leave the existing broad Backstage update route unchanged to avoid changing its permission contract in this stream.

### Events Lambda

- Add `GET /api/artists/{artistId}/availability` for authenticated members.
- Return saved selected dates and busy dates for the requested range even when public publishing is off.
- Query the artist/date index once for the range.
- Rework public `free_weekends` generation to use one range query rather than one query per date.
- Reject a new single-date availability marker when another artist event already occupies the date.
- Preserve the existing public endpoint and event record shape.

## App implementation

- Add a small authenticated artist-management API module and query hook.
- Extend the Artist domain and DTO transform for all existing availability settings and the new media providers.
- Add provider URL parsing and safe embed builders with unit tests.
- Refactor the artist edit form so curator and owner saves use their correct endpoints.
- Add the owner/admin management control and availability editor.
- Add management access on the public artist page without changing claim or `Your bndy` code.
- Add the public media section and redesigned public availability module.
- Invalidate and refresh artist, membership and availability data after writes.

## Security and privacy requirements

- Client visibility is convenience only. Every write is authorized again by the API.
- An artist membership must be active and have role `owner` or `admin` for the owned-profile route.
- Media URLs must use HTTPS and match the selected provider's accepted hosts.
- Embed URLs are generated by BNDY from parsed provider identifiers. Stored URLs never become raw iframe sources.
- Third-party players load only after a visitor taps.
- Phone and WhatsApp numbers are never public unless `publishAvailability` is true.
- The editor must state that publishing makes the selected booking contact public.
- Claim evidence and relationship creation remain outside this work.

## Verification

### `bndy-app`

- Unit tests for artist DTO availability/media mapping.
- Unit tests for provider detection, URL validation and embed construction.
- Component tests for public media loading and availability presentation where practical.
- Typecheck, test suite and production build.
- Responsive checks at 320 px, 375 px, 768 px and desktop widths.
- Keyboard, focus, labels, touch-target and reduced-motion checks.

### `bndy-serverless-api`

- Authorization tests for owner, admin, ordinary member, inactive membership, curator path and unauthenticated requests.
- Whitelist and malicious URL tests for the owned-profile route.
- Availability management read tests while publishing is off.
- Free-weekend query-count and busy-date tests.
- Toggle conflict tests.
- Existing artist and event Lambda tests.

## Delivery order

1. Commit this audited plan in `bndy-app`.
2. Implement and verify the API contract in an isolated API feature branch.
3. Implement the app management and public views against that contract.
4. Rebase or merge current main into both branches and inspect claim-stream overlap.
5. Open API and app pull requests with the API change landing first.
6. Merge only after required checks are green.
7. Smoke-check the deployed public artist read before marking the workboard item delivered.

## Acceptance criteria

- An approved artist owner or admin can enter management mode from `bndy-app`.
- They can add, change and remove supported media links without Backstage.
- Supported links appear as safe, polished, click-to-load media on the public profile.
- They can choose selected dates or automatic free weekends, set a booking contact and publish availability.
- Existing Backstage availability remains the same data and stays interoperable.
- Busy dates cannot be newly advertised as available.
- A public visitor sees a clean mobile booking surface without losing the gig list.
- Curator moderation remains separate from artist management.
- Claiming V2 files and behaviour are unchanged.

## Follow-on: Backstage calendar projection

The lightweight calendar must remain a projection of canonical Backstage data, not a second scheduling system.

### Audited source data

- Artist events in `bndy-events` include public gigs, private gigs, rehearsals and other private commitments.
- Personal member unavailability is stored against `ownerUserId`, not `artistId`, and may cover one day or a date range.
- Active Artist membership in `bndy-artist-memberships` supplies the privacy-safe bridge between an Artist and each member's unavailable dates.
- The existing public availability response contains only marked dates, so it cannot currently distinguish those blockers.

### Public projection contract

- Return only a date and one blocking category: `public_gig`, `private_booking`, `artist_commitment` or `member_unavailable`.
- Include an event ID only for a genuinely public gig so the date can link to its public gig page.
- Never return private titles, locations, notes, member names, member identifiers or counts.
- Expand multi-day unavailability across every affected date.
- Prefer public gig, then private booking, then member unavailability, then another Artist commitment when more than one reason occupies the same day.

### Enquiry behaviour

- Marked available and future unlisted dates can be selected.
- Public gigs open the public gig page. Private bookings, Artist commitments and member unavailability are not selectable.
- A selected date is inserted into the Artist's configured WhatsApp enquiry message.
- Phone remains callable. SMS is offered only for a stored UK mobile number.
- Email is not inferred from a login or membership because there is no consented public booking-email field.
- Private in-BNDY booking requests and notifications remain the separate deferred workboard item.
