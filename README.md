# Steady

A calm tracker with a simple Work view: a visual board where you draw a line (or tap two dots) to link pull requests to Jira tickets. Multiple PRs can connect to the same ticket. Meetings and notes remain available, and Personal has its own space.

The frontend is a static React app deployed to GitHub Pages. Authentication and private, cross-device data use [Appwrite](https://github.com/appwrite/appwrite), an open-source backend. Use Appwrite Cloud or your own HTTPS Appwrite server with TablesDB transaction support.

**Deployment status:** GitHub Pages is connected to the Appwrite Cloud Free project. The `steady` database and `items` table are provisioned with row security enabled and create-only access for authenticated users. Create a tracker account on the site and use the same account on each device. The setup below documents how to reproduce the configuration.

## Backend setup

1. Create an Appwrite project. You can use the Free plan in [Appwrite Cloud](https://cloud.appwrite.io), or an existing self-hosted instance. Appwrite's current free-hosting inactivity policies apply; self-hosting still requires an always-on server.
2. Add a **Web platform** with hostname `angel-dot-exe.github.io`. Add `localhost` and `127.0.0.1` as additional platforms if you want local development.
3. Ensure email/password authentication is enabled.
4. In **Databases / TablesDB**, create a database with ID `steady`.
5. Create a table with ID `items`. Enable **Row security**. At the **table** level, grant **Create** to **Users** only. Do **not** grant table-level Read, Update, or Delete to Users or Any. The client sets individual row permissions to the authenticated owner.
6. Create these required columns and wait until they are available:

   | Key | Type | Settings |
   | --- | --- | --- |
   | `payload` | Mediumtext | Required (or a legacy String column large enough for 65535 characters) |
   | `revision` | Integer | Required, minimum 1 |

7. Copy the API endpoint and project ID from project settings. They are public identifiers, not secrets. Supply them in the connection screen on each device, or configure the GitHub repository variables below so every device uses the same backend automatically.
8. Open the website, create one tracker account, and sign in to that same account on your laptop, phone, and iPad.

No Appwrite server API key is needed in this frontend. Never put an API key into a Vite environment variable or GitHub Pages source.

### Automatic backend configuration

In GitHub **Settings → Secrets and variables → Actions → Variables**, set:

- `APPWRITE_ENDPOINT`: your full HTTPS endpoint, including `/v1`
- `APPWRITE_PROJECT_ID`: your public project ID

Then run **Actions → Deploy Steady to GitHub Pages → Run workflow**. The build embeds those public identifiers. Local development uses the matching `VITE_APPWRITE_ENDPOINT` and `VITE_APPWRITE_PROJECT_ID` variables in an ignored `.env.local` file.

### Verify the backend

After provisioning, test with two separate accounts. An item created by the first must be invisible to the second. Then sign in to the first account on a second device; saved items should appear on refresh or within 10 seconds while the tab is visible. Check updates, completion, and stale-edit rejection. These live checks require an actual Appwrite project and have not been performed merely by running the unit tests.

## Behavior

- Add PRs and Jira tickets on the same board. Drag a PR connector to a Jira card, or tap the PR dot then the Jira dot. Escape or Cancel clears a pending connection. Unlink removes only the relationship. Existing Jira links appear on the board automatically.

- Saved items refresh every 10 seconds while the page is visible, and when returning to the page or reconnecting.
- New records have owner-only read, update, and delete permissions. Database authorization is enforced by Appwrite, not by hiding UI elements.
- Edits use revisions and Appwrite transactions. Conflicting edits are rejected while the local form stays open.
- Offline saves report failure. An open form is preserved in this browser's local storage until saved or closed; it is not a background offline upload queue.
- The optional Export button downloads your records as JSON. Keep exports as backups.
- Existing data on the original private Sites deployment is not automatically migrated to Appwrite.
- PRs and Jira tickets are manually entered links; the app does not connect to your GitHub or Jira account.
- Password recovery is not yet implemented in the UI. The project administrator can manage users through the Appwrite console.

## Development

Use Node.js 24 or newer.

```sh
npm ci
npm test
npm run dev
npm run build
```

## GitHub Pages

Set **Settings → Pages → Source** to **GitHub Actions**. The included workflow runs checks, builds, and deploys on pushes to `main`. `vite.config.ts` uses `/steady-tracker/` as the base path.

The public site contains application code only. Notes and tasks live in the authenticated Appwrite database, not in the repository or deployed assets.
