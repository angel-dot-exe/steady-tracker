# Ambient connections — free deployment

Status (October 29, 2026): `ambient-sync` deployed successfully (deployment `6ae33bdc2c16eae11644`). Private `connections` table exists with required Mediumtext payload, row security enabled and no client permissions. Function execute access is limited to the tracker owner, with `rows.read` and `rows.write` dynamic scopes, logging disabled and the free 0.5 CPU / 512 MB runtime. Encryption and owner variables are saved as secrets. Anonymous execution was rejected with HTTP 401; a short-lived owner JWT received HTTP 200 from the status action. Jira/GitHub credentials and provider authorization are still pending; interval remains 0 until connections are tested. GitHub Pages is already live. No subscription, payment method, cron schedule, or paid add-on is required for this design.

## One Appwrite Function

Use the existing Free project `6ae1f281001e1b52c48c` and database `steady`.

- Create a table `connections` with required Mediumtext column `payload`. Enable row security and leave **all table permissions empty**. Rows are server-only and get no client permissions.
- Create function `ambient-sync`, Node.js 22 or newer, entrypoint `main.mjs`, build `npm ci --omit=dev`, timeout 900 seconds or the maximum permitted by the Free plan. Use the smallest free runtime size.
- Deploy this directory (excluding node_modules). Keep function execution logs private. Do not enable request/response body logging: OAuth codes travel in requests.
- Execute permission: the specific tracker user's ID only. Dynamic API key scopes: `rows.read`, `rows.write`. Do not grant database/schema administration scopes.
- Schedule: **Interval, 60 minutes**. Do not choose cron: Appwrite Cloud cron requires a paid plan as of October 19, 2026. If 60-minute intervals are unavailable in the account, leave scheduling off and report the blocker; never upgrade.
- Set secret environment variables: `TOKEN_ENCRYPTION_KEY` (32 random bytes encoded as 64 hex characters), `STEADY_OWNER_ID` (the signed-in tracker user's Appwrite ID), `JIRA_CLIENT_ID`, `JIRA_CLIENT_SECRET`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`. Use console secret fields; do not commit or paste credentials into chat.
- Appwrite supplies `APPWRITE_FUNCTION_API_ENDPOINT`, `APPWRITE_FUNCTION_PROJECT_ID`, and its dynamic API key at execution time.
- Only after backend deployment is validated, set GitHub repository variable `SYNC_FUNCTION_ID=ambient-sync` and redeploy Pages. Before then, the UI honestly displays “Not connected / setup needed.”

## Jira OAuth registration

The resource-level **Steady Ambient Tracker** OAuth registration was created with user-approved terms on October 29, 2026. Existing app ID: `05435097-544a-42f1-af72-277a6f6b1b84`. Continue configuring this app; do not create a duplicate. Callback saved and visually verified on October 29, 2026. User confirmed saving the two requested read scopes; console shows Scopes Used: 2. Client credentials and actual account authorization remain pending; the backend is deployed. Desktop automation changes the URL but often shows stale or blank content; user has been completing console steps manually. Configuration:

- Callback: `https://angel-dot-exe.github.io/steady-tracker/?integration=jira`
- Jira API scopes: `read:jira-work`, `read:jira-user`.
- Authorization requests also use `offline_access` to receive rotating refresh tokens.
- Authorize only `https://ambsec.atlassian.net`.
- No Jira write or admin scopes. Initial query: `project = AMB AND assignee = currentUser()`.

For the existing project, run `python3 scripts/configure-jira.py` in a local terminal to save the Jira Client ID and Secret directly into secret function variables. The helper uses the official authenticated Appwrite CLI, hides secret input, and never writes credentials into this repository. After saving, verify runtime configuration, authorize Jira through Steady, test imports, then enable the free 60-minute interval.

## GitHub App registration

Register **Steady Ambient Tracker** under the user's own developer settings. Choose a unique name if needed. Use GitHub App user authorization, not a general OAuth app with broad `repo` permissions.

- Homepage: `https://angel-dot-exe.github.io/steady-tracker/`
- User authorization callback: `https://angel-dot-exe.github.io/steady-tracker/?integration=github`
- Expiring user access tokens enabled. User authorization requested for installation.
- Repository permissions: **Pull requests: Read-only**, **Metadata: Read-only**. No contents, issues, or write permissions.
- Webhooks disabled for this first hourly implementation.
- Allow installation in the `ambientdev` organization, on only the relevant repositories. Organization approval may be necessary: current GitHub membership is `member`, not owner.
- Creating/installing the app or granting access must be confirmed at the actual permission screen. Do not bypass organization restrictions.

## Import behavior and verification

The function imports assigned AMB tickets and PRs in authorized ambientdev repositories that are authored by the connected user or mention an assigned AMB ticket. PR scanning covers updates within the last 90 days. An AMB key can occur in title, body, or branch. If several assigned ticket keys occur, the first matching key is used; the user can change the link manually.

Only title, URLs, deadline, and remote status are stored. PR bodies are read for matching, but aren't stored. Per-user deterministic IDs prevent duplicates. Imported rows have owner-only permissions. Refresh preserves notes, planning date/order, manual completion and manual linking. Remote status is displayed independently from personal completion. Tickets reassigned away are retained with `sourceAssigned: false`; plans are not deleted.

Test actual authorization and refresh tokens, sync twice without duplicates, verify an existing manual URL record is reused, and make a Jira assignment/PR change to check a subsequent sync. Check a second tracker account cannot execute the function or read rows. Unit tests cover matching, preservation, owner-specific identities, encrypted credential storage and unauthenticated rejection; they do not replace live-provider verification.

## Cost boundary

Remain on Free. Hourly interval and manual sync only; no paid scheduler. If a free quota is reached, stop/retry later and display the error. Do not upgrade or add billing. The Free project may pause after inactivity. Organization permission and account consent are separate from payment.

Sources: [Appwrite free scheduling](https://appwrite.io/changelog/entry/2026-10-15-1), [Appwrite pricing](https://appwrite.io/pricing), [Jira OAuth](https://developer.atlassian.com/cloud/jira/platform/oauth-2-3lo-apps/).
