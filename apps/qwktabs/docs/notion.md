# Send collections to Notion

LeoTabs exports a **snapshot** into Notion. It creates pages containing your collection names, saved links, groups and notes. It is not two-way sync: editing either side does not update the other, and there is no Notion-to-LeoTabs sync/import connection.

You can export one collection or the entire library. For local files instead, see [Backup, import and export](import-export.md).

## Before you connect

You need a Notion workspace, a destination page and an internal Notion connection token. LeoTabs calls this an **internal integration** in its settings; current Notion documentation also calls it an **internal connection**.

Use a dedicated parent page such as “LeoTabs exports” so you can control who sees the exported work. Access to that page can expose its child export pages too. This is a direct connection to your account, not a LeoTabs-hosted service.

## 1. Create an internal connection

1. Open Notion's Developer portal from the [official authorization guide](https://developers.notion.com/guides/get-started/authorization).
2. Create an internal connection in the intended workspace. Notion currently requires a workspace owner for this; ask your workspace owner if the option is unavailable.
3. Give it a recognisable name, such as LeoTabs exports, and enable the content capability needed to create pages and append blocks: **Insert content**.
4. Copy its installation access token from the connection's configuration. Keep it private; do not paste it into a page, issue, screenshot or repository.

LeoTabs exports content without reading workspace users or comments. It does not need user-email or comment capabilities. Notion's [capability reference](https://developers.notion.com/reference/capabilities) explains the access options. Workspace restrictions can also affect availability.

Use this internal-connection flow for LeoTabs. Notion's newer personal-token tutorials describe a different, broader user-scoped credential and are not required for this setup.

## 2. Give the connection a destination

1. Open the parent page in the same Notion workspace.
2. Open its **•••** menu, choose **Add connections**, and select the connection you created.
3. Confirm the connection now has access to the parent.

A page being visible to you, or shared with your email address, does not automatically grant an internal connection access. You do not need to publish the page to the web.

## 3. Find the page ID

Copy the parent page's link. Its page ID is the 32 hexadecimal characters at the end of the page path, sometimes displayed with hyphens. Do not paste the whole URL into LeoTabs's **Notion parent page ID** field.

For this made-up link:

```text
https://www.notion.so/LeoTabs-exports-0123456789abcdef0123456789abcdef
```

The example page ID is `0123456789abcdef0123456789abcdef`. Use your actual parent page's ID, not this example. Ignore URL query parameters such as a view identifier. Choose a regular page as the parent; the exporter creates child pages, not rows in a Notion database/data source.

## 4. Save the connection in LeoTabs

1. Open **Settings → Notion**.
2. Paste the token into **Notion integration token**.
3. Paste the parent page ID into **Notion parent page ID**.
4. Choose **Save settings** and allow access to `https://api.notion.com` when requested.

Saving settings does not verify the token or page access. First test with a small collection containing harmless sample links.

## Export one collection

Open the collection's menu, choose **Export → Send to Notion…**, review the destination page ID and choose **Create Notion page**.

The result is a new child page named after the collection. Groups become headings; links become bookmark blocks with title captions; collection/link notes become text. This saves links and notes, not full articles or screenshot previews.

Only HTTP(S) links are accepted for this export, and URLs must be no longer than 2,000 characters. For a collection containing file links or unsupported URLs, use Markdown or backup JSON instead.

## Export the whole library

Choose **Settings → Export & import → Send to Notion…**. Review the number of pages and destination, then choose **Create Notion pages**.

Every collection across all spaces is included, one new page per collection. Pages go under the chosen parent; LeoTabs does not recreate spaces as another hierarchy of parent pages. This is a whole-library export, not just the currently visible space.

## Pause, continue and avoid duplicates

Large exports send content in batches. **Pause** stops between batches; a request already sent may still finish. Open search with **Alt+Shift+K**, type **/recovery**, choose **Recovery**, then choose **Continue export** on the existing job. Pages already marked complete are not sent again by that job.

Starting a brand-new export creates new pages, even if you exported the same collection before. It does not find and update an earlier export.

If LeoTabs says the result is **uncertain** or the response was lost, check Notion first. The batch may already exist, so LeoTabs will not blindly resend it. Compare the destination with your collection and only start another export after you understand which content would be duplicated. Local Undo cannot delete Notion pages; remove unwanted remote pages in Notion.

## Troubleshooting

| Problem | What to do |
| --- | --- |
| Invalid destination page ID | Paste only a 32-character hexadecimal ID, with or without hyphens; check you selected a page |
| HTTP 401 | Verify the token, workspace and whether the token was revoked |
| HTTP 403 | Check Insert content capability and workspace restrictions |
| HTTP 404 / destination inaccessible | Add the connection to that exact parent page; check workspace and page ID |
| HTTP 400 / unsupported URL | Check the parent type and link limits; try a small collection or file export |
| Notion is busy / HTTP 429 | Wait and continue the same job from Recovery; avoid starting duplicate jobs |
| Uncertain / timeout / incomplete response | Inspect Notion before retrying; remote writes may have succeeded |
| Only some pages are present | Review Recovery status and continue the existing export when offered |
| New pages duplicate earlier pages | A new export is a new snapshot; use the existing job only for resuming |

## Disconnect and privacy

Use **Settings → Notion → Forget Notion token** to delete the saved token. Revoke the connection/token in Notion if it should no longer have access, and remove its connection from the parent as needed. LeoTabs's **Privacy & permissions → Revoke access** removes optional browser access.

The token stays in browser-local storage without LeoTabs-managed encryption and is excluded from backup files. Exported content travels directly to Notion; people with destination access may see it. Disconnecting, clearing local data or uninstalling does not delete pages already exported. See the [privacy policy](../extension/privacy.html).
