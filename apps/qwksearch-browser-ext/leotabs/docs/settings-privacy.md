# Settings and privacy

Open Settings in the library to control appearance, connections, export and optional access.

## Appearance and browsing

**Theme** offers System, Light and Dark. Board/list controls change the collection view. **Open Library in its own window** gives the library a separate window.

**Auto-update all collections** controls the saved collections' ongoing relationship with their open windows. **Auto-group new tabs** controls local website grouping. They are different settings; see [Save, open and switch](saving-switching.md) and [Groups](groups-selection.md).

## Preview images

Open **Settings → Privacy & permissions**.

**Automatic page previews** captures the visible active web page while browsing. It is off by default and requests website access when enabled. Screenshots stay in this browser profile and can contain anything visible on the page.

Opening the visual switcher can also capture the current web page using temporary access, **even when automatic previews are off**. Search-only mode does not request that visual-switcher capture.

Use **Clear previews** to remove cached screenshots. Disabling automatic capture stops that automatic behaviour but does not itself erase existing images. Images expire after 14 days, with a default cache budget of 50 MB; cleanup runs during use/startup. Private/incognito pages are excluded.

## Optional permissions

Enable browser history if you want matching history results in search. Direct browser-bookmark import and export request bookmark access when needed. AI and Notion request their API origins; a custom AI service uses the endpoint you configure.

**Revoke access** removes optional website, bookmark and history permissions and disables automatic preview capture. It does not delete existing local data, provider accounts or exported Notion pages. See [Permissions](permissions.md).

## Saved credentials

AI keys and the Notion token are kept in browser-local storage and excluded from backup files. LeoTabs does not encrypt them with its own key or an operating-system keychain.

Use **Forget AI key** for each saved provider/custom endpoint and **Forget Notion token** in Notion settings. If a credential may have leaked, revoke it at its provider too. A blank password field when saving settings preserves an already stored key; it is not a delete action.

No AI connection is necessary for ordinary tab management. See the detailed [AI](ai.md) and [Notion](notion.md) guides before connecting.

## Delete or move your data

Edit/delete items in the library. Recovery copies may remain after item deletion. Download a backup before uninstalling; uninstalling removes local extension data, including recovery. It does not remove exported files, clipboard copies, browser bookmarks or data already sent to a provider.

There is no developer-operated copy of your library to recover from. Email [support@ringlochid.me](mailto:support@ringlochid.me) for privacy questions, and read the [full policy](../extension/privacy.html) for retention and sharing details.

## Cost

LeoTabs is currently free. Optional AI providers may charge your API account separately, and Notion has its own plans and terms.

LeoTabs does not provide hosted backup or automatic cross-device sync. Use [Backup JSON](import-export.md) to move your library between installations.
