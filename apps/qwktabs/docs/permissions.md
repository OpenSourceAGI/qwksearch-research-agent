# Permissions explained

LeoTabs asks for browser access to provide tab management, saving, search and recovery. It does not require access to every website at installation. You can use core features without enabling AI, Notion, history search or automatic previews.

## Core permissions

| Permission | Why LeoTabs uses it |
| --- | --- |
| tabs | Read titles/URLs to list, search, save and switch tabs |
| tabGroups | Read, create and change browser groups |
| storage | Save preferences, connection keys and temporary state |
| unlimitedStorage | Keep the local library, recovery records and bounded image caches |
| activeTab | Temporary current-page access after a user action, including a switcher preview |
| scripting | Display the bundled switcher on the current page |
| sessions | Find and restore recently closed browser sessions |
| alarms | Schedule local recovery checkpoints |
| favicon | Display website icons through the browser's favicon service |

These permissions do not mean the developer receives your tabs. Optional external connections are described below and in the [privacy policy](../extension/privacy.html).

## Optional access

**History:** explicitly enable it for browser-history search. Queries return up to 40 results from the previous 30 days.

**Bookmarks:** requested for **Import browser bookmarks** and **Export to browser bookmarks…**. LeoTabs reads the bookmark tree for import or destination selection, and creates new bookmarks when you export a collection.

**AI provider websites:** granted when configuring/using AI. LeoTabs sends requests directly to the selected provider's API. Compatible endpoints can be your own HTTPS server or a loopback service on the same computer.

**Notion:** granted for requests to `api.notion.com` when configuring/exporting.

**All websites:** optional automatic previews need access to capture active web pages as you browse. The manifest's optional all-URLs declaration also permits user-chosen compatible API endpoints; it is a ceiling for permissions you may grant, not automatic access to everything.

## Refuse or revoke access

Declining optional access leaves that feature unavailable. Core tab management remains usable.

Go to **Settings → Privacy & permissions → Revoke access** to remove optional website, history and bookmark permissions. Automatic previews also turn off. This does not erase old caches or exports; use Clear previews or manage exported copies separately.

To stop a connection entirely, forget its local key/token and revoke it at the provider if appropriate. See [AI](ai.md), [Notion](notion.md), and [Settings and privacy](settings-privacy.md).
