# Save, open and switch

Choose an action based on whether you want to keep browsing, put work away, or replace the current window's task.

| Action | Result |
| --- | --- |
| Save tabs / Stash tabs | Create a new collection from eligible open tabs; closing is an option |
| Drag into an existing collection | Save the dragged links in that collection while keeping the browser tabs open |
| Open | Open fresh tabs from a collection without replacing your current work |
| Open in new window | Open the collection in a separate browser window |
| Switch | Make a collection current in this window, with choices for the outgoing work |
| Close current collection | Close its managed tabs after saving recovery information |
| Close all currently open tabs | Close the current window's unpinned tabs with recovery information for eligible pages |

## Save tabs

Use **Save tabs**, the tray icon beside **Open tabs**, in the library or switcher. Select tabs first to limit the action. This dialog creates a new collection; it does not have a destination picker.

**and close them** closes the tabs after saving. The confirmation button reads **Stash tabs** when this is checked, or **Save tabs** when it is not. Choosing **Stash tabs** from the search command list opens the dialog with closing selected.

**and switch to new collection** makes the new collection current in this window without reopening its tabs. It requires all unpinned tabs in that window. Closing and switching to the new collection are mutually exclusive.

Dragging open tabs or an open group into an existing collection saves copies of their links. It does not close the original tabs.

If AI has been configured with a saved key and access, a new save can receive an automatic descriptive name. Saving does not wait for that result, and a manual rename is respected. [Understand automatic AI naming](ai.md).

## Open saved work

Choose Open to add fresh tabs, or Open in new window from the collection menu to keep it separate. Use Select if you only want some links. Saved pages can be deferred until activated rather than all loading at once.

An individual saved link always opens a new tab. It does not simply focus an existing copy of the same URL.

## Switch between tasks

Choose **Switch** on the destination collection. Read the outgoing-work choices before confirming. With no active collection, saving current tabs as a new collection is unchecked by default. With an active collection, updating that collection from the current tabs is also a separate, unchecked choice.

A one-time update does not automatically enable ongoing Auto-update. Recovery information is kept for supported switching operations even if you do not retain an outgoing collection.

Pinned browser tabs stay open. Browser-internal and other extension pages are not saved as ordinary links; new-tab/settings pages may close during a switch. Saving a URL does not capture unsaved form input or a website's in-memory state.

## Auto-update

The current collection's **Auto-update** switch controls whether changes to this window update its saved links and layout. Pause it to keep the saved collection fixed while you browse elsewhere.

Resuming Auto-update immediately updates the saved collection from the window's current tabs, then follows later changes. Check the open tabs before resuming. If the same collection is already tracking another window, switch to that window instead of expecting two windows to update it at once.

**Settings → Auto-update all collections** changes this preference globally for existing, open and new collections. Auto-update and **Auto-group new tabs** are independent: one updates saved work, the other organises live tabs.

Use [Undo, Timeline and version history](recovery.md) if a supported action needs to be reversed.
