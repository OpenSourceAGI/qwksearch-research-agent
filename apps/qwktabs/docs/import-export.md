# Backup, import and export

A backup is the best way to carry your library to another installation. Markdown and bookmark HTML are useful when you want your links outside LeoTabs.

## Choose an export

| Format | Use it for | What it contains |
| --- | --- | --- |
| Backup JSON | Restore or move a library | Spaces, collections, groups, notes, allowed preferences and recent action-reference log |
| JSON in a collection's Export menu | Share or copy one saved collection | Collection structure and links |
| Bookmark HTML | Import links into a browser or bookmark tool | Folder/link structure suitable for bookmark import |
| Markdown | Readable notes and links in another app | Collection/group headings, links and notes |
| Copy Markdown | Paste one collection into another app | The collection's Markdown content on the clipboard |
| Browser bookmarks | Create bookmarks directly in your browser | A new destination folder and collection groups/links |
| Notion | Create remote snapshot pages | See the [Notion guide](notion.md) |

A backup does **not** contain API keys, screenshots, browser history, live browser session IDs or full older recovery snapshots. The exported action log is informational; importing it does not replay old browser actions.

## Back up the whole library

1. Open **Settings → Export & import**.
2. Choose **Backup JSON**.
3. Keep the downloaded `backup.json` somewhere you control. Rename it with a date if you keep several copies.
4. Before an important migration, check that the file downloaded successfully and keep the original installation until you have verified the import.

Whole-library HTML and Markdown downloads use names such as `bookmarks.html` and `collections.md`. A collection's own export menu uses its name for individual files.

## Export one collection

Open its **••• → Export** menu and choose a file format or Copy Markdown. Browser bookmark export requests bookmark access, lets you choose a destination folder and creates new bookmarks. It does not replace your existing bookmark tree. Browser sync may separately sync those bookmarks.

## Import saved work

1. Choose **Settings → Export & import → Import data**.
2. Expand **Import from a file**, choose **Choose file**, and select a supported export. The file must be no larger than 20 MB.
3. Review the number of collections/links and any skipped items.
4. If the backup offers preferences, decide whether to restore them.
5. Choose **Import collections**, then inspect the new collections.

Imports create separate copies; importing the same file again can create duplicates. Import is not a destructive “replace everything” restore.

Supported inputs include LeoTabs backup/collection JSON (including compatible older Neo-format files), supported Toby collections/cards JSON, bookmark HTML, Markdown links and OneTab text. Arbitrary JSON files or every historical third-party format are not guaranteed to import. Unsupported URLs/items may be skipped or reported.

To import bookmarks directly from this browser, choose **Import browser bookmarks** in the same dialog and grant bookmark access. Review the import preview before adding them.

The library supports up to 2,000 collections and 50,000 saved links. An import that would exceed either limit is rejected.

API keys and website permissions are not transferred. Reconnect integrations on the destination. Automatic preview capture stays off when importing preferences until you enable it in Settings.

## Moving to another browser or the store version

Export in the original installation, install LeoTabs in the destination, then import. Verify spaces, collection counts and several links before removing the original. Local data is tied to the browser profile and extension identity; the store version can have a different identity from an unpacked build.

## Protect exported files

Exports are not encrypted by LeoTabs. Full URLs, local file paths, titles and notes can contain sensitive information. Review a file before sharing it. Downloaded files and clipboard copies remain outside LeoTabs's control; uninstalling does not delete them.

See [Recovery](recovery.md) if the original library is still available but a recent operation went wrong.
