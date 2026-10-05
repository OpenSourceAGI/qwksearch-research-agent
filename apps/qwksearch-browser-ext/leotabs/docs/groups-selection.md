# Groups, sorting and selection

LeoTabs works with both **live browser groups** and **groups inside saved collections**. Changing a saved group does not always change open tabs; the relationship depends on whether that collection is current and tracking its window.

## Group by website without AI

Choose **Group & sort** from the open-tab actions or a collection's menu. LeoTabs uses built-in website rules and names groups locally. You do not need a provider account.

Ungrouped tabs come first. Included tabs and groups are sorted A–Z. The open-tab menu also offers **Title A–Z**, **Website** and **Most recent first**; these keep ungrouped tabs before groups too.

The Group panel lets you decide whether already grouped tabs should be included. Existing selection limits the operation to the chosen tabs in the current window. Pinned tabs remain pinned. Undo restores the previous supported grouping, colours and order.

**Auto-group new tabs** controls ongoing local grouping. New automatic groups require at least two matching tabs; manual corrections and Undo are respected. This is independent of collection Auto-update.

## Group by topic with AI

Topic grouping can place pages from different websites into one shared-purpose group. It sends titles and URLs to your configured provider and applies the result with Undo. For saved work, **Organise collection with AI** can also update its name and note.

Read [AI setup and data sharing](ai.md) before using it. Choosing website grouping does not send that information to AI.

## Select several items

Use Select/check boxes to enter selection mode. Shift-click selects a range; Ctrl-click on Windows/Linux or Cmd-click on Mac toggles individual items where supported. Keyboard checkboxes are also available.

Saved-link selection offers actions such as Open, Group, Ungroup, Rename group, Move and Remove. Selecting a group includes its links. Live-tab selection offers Group, Ungroup, Rename group and Close tabs. Read the current action's label to see whether it acts on saved links or browser tabs.

## Drag and drop

- Drag open tabs into a collection and follow the insertion line to choose their position. The browser tabs stay open.
- When dragging individual tabs or selected links, their source group does not come with them. Drop inside a saved group to join it; drag the group header to carry the whole group.
- Place a whole group before, between or after ungrouped tabs. Manual order is saved; explicit Group & sort or AI organisation puts ungrouped tabs first again.
- Dropping into a folded collection or group expands it. Editing an active saved collection pauses Auto-update so live browsing does not overwrite your placement.
- Drag saved links or a saved group to move them; hold Ctrl while dragging to copy where the drop hint indicates copying.
- Drag live tabs onto another live group or the Ungroup area to change membership.
- Drag collection headers or space names to reorder them; follow the insertion bar.
- Moving the last saved link out of a group removes that empty group.

Use menu and selection actions when you do not want to drag.

## Duplicate tabs

The broom beside **Open tabs** shows how many duplicate tabs it will close. Clicking it performs the close action immediately; there is no second confirmation. It acts on eligible live tabs in the displayed scope and preserves pinned tabs. Duplicating a saved collection is a separate collection-menu action.
