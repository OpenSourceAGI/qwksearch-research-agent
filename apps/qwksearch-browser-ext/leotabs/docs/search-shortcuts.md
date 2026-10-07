# Search and keyboard shortcuts

| Default shortcut | Opens |
| --- | --- |
| Alt+Q | Visual switcher over the current page |
| Alt+Shift+Q | Library |
| Alt+Shift+K | Search only, without preview cards and the collection dock |

Use **Settings → Keyboard shortcuts** or open `chrome://extensions/shortcuts` to change bindings. In Edge use `edge://extensions/shortcuts`. A shortcut can be unassigned because another extension, browser or operating-system action already uses it.

## Visual switcher

Press Alt+Q to open or close it. Select a page to switch to it. A group tile lets you navigate that group's pages. The switcher follows the LeoTabs light/dark theme setting.

On protected pages where the browser will not allow an overlay, LeoTabs opens a separate extension window. That window has different focus behaviour from an overlay inside a web page.

The switcher may cache a screenshot of the visible current web page. It uses an available preview rather than visiting background pages to create one. Missing previews do not stop tab switching. See [preview controls](settings-privacy.md).

## Search across the library

Press **Alt+Shift+K** to open search. This searches saved work across spaces, alongside eligible open and recently closed pages. The visual switcher's search field uses the same collection scopes and commands.

Search open pages, saved links, notes and recently closed pages. Optional browser-history results require permission and cover the previous 30 days.

Type `@` to choose a collection scope. Its results are the links saved in that collection, even if additional copies are currently open elsewhere. Type `/` to find actions. Use Up/Down and Enter to choose a result and perform its displayed action.

Escape clears a query or goes back/closes the current search view. In selection mode, Escape leaves selection first.

The library offers **This window** and **All windows** for its open-tab sidebar. Those choices change the live tabs shown, not the contents of a saved collection.

## Search across all spaces

The search field above **Open tabs** filters the sidebar and searches saved tabs, collection names, group names and notes across all spaces. Press **/** to focus it. Results stay inside their collection cards, with matching text highlighted and folded groups expanded temporarily. Each card shows its space.

The result count and **Clear search** button appear above the cards. Clearing search returns to your previous view and scroll position. **This window** and **All windows** apply only to open tabs. This field does not use `@` collection scopes or `/` commands; use **Alt+Shift+K** for those.

No space is highlighted during global search. Click a space to clear the query and open its collections, including the space you were browsing before searching.

## Address bar and other entry points

Type `leotabs`, then Tab or Space, in the address bar. Enter a query or press Enter to open the library. The toolbar lion also opens the library, and Settings offers **Open Library in its own window**.

If a shortcut does nothing, first test the toolbar button, then check the binding and try a normal HTTPS page. See [troubleshooting](troubleshooting.md).
