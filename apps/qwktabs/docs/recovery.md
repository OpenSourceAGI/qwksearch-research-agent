# Undo, Timeline and recovery

LeoTabs stores recovery information around supported edits and tab operations. It helps restore saved structure and URLs; it cannot recreate everything happening inside a web page.

## Undo a recent action

Use the **Undo** action shown after a supported change. This can reverse edits such as moving a space, organising a collection or changing groups. Some browser actions require the relevant tabs/window to still be compatible with the recorded state.

If newer changes make Undo unsafe, do not repeatedly force the old action. Use Timeline or a collection's version history to inspect the earlier work.

## Timeline and collection versions

Open **Timeline** in the sidebar to find recorded sessions and browsing-work events. Preview the listed pages before restoring.

A collection's **Version history** menu shows earlier snapshots. Use **Restore this version** for the snapshot you want. Read the action shown in the dialog: restoring a version and reopening a group of browser tabs are different operations.

If you need a separate copy rather than changing the current collection, use the recovery option that creates/restores a copy when available. Keep a backup before combining several recovery actions.

## Interrupted operations

Open search with **Alt+Shift+K**, type **/recovery**, and choose **Recovery** to inspect recorded actions. A restart does not automatically repeat an interrupted close.

**Recover pages** reopens saved pages. **Restore earlier collection… → Restore selected copies** adds separate copies of earlier collections. **Undo action** reverses an operation when that option is available. These are different from **Version history → Restore this version**, which restores the selected collection itself and keeps its previous version in history.

For Notion, use the same export job to continue recorded progress. An uncertain remote write may already have succeeded; inspect Notion before starting another export. [Notion recovery](notion.md) explains this in detail.

## What is retained

Completed action records are limited to the most recent 20. Closed-page records are limited to 1,000 entries or 30 days. Timeline/version records are bounded to 200 entries or 30 days during pruning. Unfinished jobs can remain until dealt with.

These limits are not a permanent archive or an exact deletion timer for an idle browser. Download backups for work you need to keep long-term.

Deleting a collection can leave earlier recovery copies. Removing optional permissions also does not erase previously stored snapshots. See [Settings and privacy](settings-privacy.md).

## What recovery cannot restore

- Unsaved form input, authentication/login state, or a web application's in-memory work.
- Remote Notion pages through local Undo.
- Files you deleted outside LeoTabs.
- Local extension data after uninstalling, unless you kept an export or another usable copy.
- Every internal/protected browser page or a tab that changed in a way that makes the recorded operation unsafe.

When unsure, preserve the current library with a backup before continuing. For a bug report, describe the sequence using sample pages instead of sharing a real browsing backup.
