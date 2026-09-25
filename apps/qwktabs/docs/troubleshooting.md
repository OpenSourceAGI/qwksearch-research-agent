# Troubleshooting

Start with the smallest affected action and keep a backup before reinstalling, importing repeatedly or changing stored work.

## The shortcut does not work

Open the browser's extension shortcut settings and check whether the binding is assigned. Another extension or the operating system may own it. Try the toolbar button and a normal HTTPS page. Protected pages use a separate extension window rather than an overlay.

Default shortcuts are Alt+Q, Alt+Shift+Q and Alt+Shift+K. [Shortcut guide](search-shortcuts.md).

## The library looks empty

Check the search query and collection scope. Library search covers all spaces; choosing a space clears the search. Folded collections and preview limits can hide links; use the chevron or Show more. Confirm you are in the same browser profile and installation as before.

An unpacked build and a store installation can have different IDs and local libraries. Do not uninstall the old one until you have exported and verified a backup. [Migration guide](import-export.md).

## The library stops updating

LeoTabs retries temporary loading failures. If a loading or refresh message remains, choose **Retry**. The last loaded view stays visible during recovery. If the extension was updated while the page was open, reload the page. For an unpacked build, reload the extension first.

## A collection changes when I browse

Check its Auto-update switch and **Settings → Auto-update all collections**. Pause updating to keep the saved list fixed. Auto-group new tabs is a separate control for live browser grouping.

## Grouping did not do what I expected

Website grouping is local and groups by site. AI topic grouping groups by shared purpose across sites. Check whether existing groups were included and whether a selection limited the action. Isolated links can remain ungrouped.

AI collection organisation updates its name, overview and groups; it does not promise to reorder all links. [Groups](groups-selection.md) · [AI](ai.md).

## Dragging does not change the order

Drag the space name or collection header and wait for the insertion bar at a new position before dropping. Dropping back in the same slot changes nothing. Space menus also offer Move left/Move right. Refresh the library after an extension update. For a development copy, reload it on the browser's extensions page first.

If the problem persists, report the source/target positions and whether it survives a page refresh. Use sample names in screenshots.

## A preview is missing or stale

A page must have an eligible active-page capture; LeoTabs does not load background pages merely to create previews. Private or protected pages may not be captured. Try Clear previews and reopen the visual switcher on a normal page. Automatic previews need their optional access.

Turning off automatic previews does not disable capture when you explicitly open the visual switcher. [Preview controls](settings-privacy.md).

## AI or Notion fails

Use the dedicated [AI troubleshooting table](ai.md) or [Notion troubleshooting table](notion.md). Verify account access, credentials, destination/model and permissions. Do not paste a key into an error report.

An uncertain Notion response may have created remote content. Inspect the destination before starting another export.

## Import is rejected or duplicates appear

Check the format, use a supported export, and read the import preview. Imports add copies; they do not replace the whole library. Keep the source file and avoid repeated imports while investigating. [Import/export guide](import-export.md).

## Tabs closed unexpectedly

Check Undo and Timeline. To open Recovery, press **Alt+Shift+K**, type **/recovery** and choose **Recovery**. Avoid further changes while you inspect the recorded operation. Recovery can reopen URLs and groups but cannot restore unsaved form contents. [Recovery guide](recovery.md).

## Closing tabs reports skipped tabs

The message counts confirmed closures and skipped tabs separately. Choose **Details** for the reason. LeoTabs skips tabs that change pages, windows or groups while closing, and reports browser failures without retrying the close. Undo restores the tabs that were closed.

## Report an issue safely

Email [support@ringlochid.me](mailto:support@ringlochid.me) with the LeoTabs version, browser/OS version, expected result and reproduction steps. A short example with harmless pages is more useful than a complete personal library.

Review screenshots and logs for URLs, email addresses, credentials and private notes. Report security issues privately with the subject “LeoTabs security report”.
