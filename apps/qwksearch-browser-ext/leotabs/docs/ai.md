# AI setup and use

AI is optional. Saving, switching, searching, notes, website grouping and file exports work without an AI connection.

An AI connection uses **your provider account and API access**. A subscription to a provider's chat website is not the same thing as an API key or API credit. Confirm billing and model access with that provider before use.

## What AI does

| Feature | How to use it | What changes |
| --- | --- | --- |
| Automatic naming | Save a new collection after configuring a saved key and provider access | A short descriptive name may replace the generated save name |
| Group open tabs by topic | Choose the AI topic-grouping action for open tabs | Related tabs form groups across websites |
| Organise collection with AI | Collection menu → Organise collection with AI | Collection name, overview note and topic groups |

Website grouping is local and does not use AI. Current AI tools infer from link metadata: they do not read the full article/page body. The collection overview is a summary of that metadata, not verified research.

## Connect a provider

1. Open the library and choose **Settings → AI connection**.
2. Select OpenAI, Claude (Anthropic), Gemini (Google), DeepSeek, or Other / OpenAI-compatible.
3. Create an API key in that provider's own account portal. Set spending limits or quota there if available. Never use a key supplied by an unknown person.
4. Enter a model identifier available to your API account. The prefilled model is a convenience, not a guarantee of account access or ongoing availability.
5. Paste the API key into its password field. Read the disclosure about automatic naming, transmitted information, storage and charges.
6. Choose **Save settings**, then approve access to the displayed provider origin if you want that connection.
7. Try an AI action on a small collection of harmless sample links. Saving settings stores the connection; it is not a live credential test.

Keys are saved separately for each provider, and for each complete custom endpoint. Changing providers does not intentionally send the old provider's key to the new one. A blank key field keeps an existing saved key; use **Forget AI key** to remove it.

## Provider setup references

Use these official instructions to create credentials and choose an available model:

- [OpenAI API quickstart](https://developers.openai.com/api/docs/quickstart).
- [Anthropic API overview](https://platform.claude.com/docs/en/api/overview).
- [Google Gemini API keys](https://ai.google.dev/gemini-api/docs/api-key).
- [DeepSeek API quickstart](https://api-docs.deepseek.com/).

The standard provider choices use their built-in API addresses. You do not need to edit an endpoint for those choices.

## Custom or local endpoints

Choose **Other / OpenAI-compatible** and enter the complete chat-completions URL, not only a server hostname. The service must understand the OpenAI-style messages and JSON response format used by LeoTabs.

For example, a local server that exposes that route might use `http://127.0.0.1:1234/v1/chat/completions`. This is an example, not a server installed by LeoTabs. Enter the actual model name loaded by your server. Leave the key blank only if that service does not require one.

Remote endpoints must use HTTPS. HTTP is accepted only for loopback hosts on your own computer. URLs containing embedded usernames/passwords, a query string or a fragment are rejected. A proxy or remote endpoint operator receives the information sent to it. Different “compatible” servers support different fields, so compatibility must be tested.

Automatic naming currently requires a saved key; a keyless local connection can be used for explicit compatible AI actions but does not activate automatic naming.

## Exactly what leaves your browser

Collection organisation, open-tab grouping and the switcher use the same AI planner. Requests include chosen titles, full URLs and temporary identifiers. Collection organisation also includes its name, note and link notes. Open-tab grouping includes matching link notes from the current collection; its name and overview are included only when the selection matches the whole collection. Links excluded from regrouping can still be included as context, but cannot be reassigned.

Open-tab and switcher actions change groups and order. Only **Organise collection with AI** updates the collection name and note. The same model and context can still produce different groupings on separate runs.

Automatic naming sends titles and URLs of the newly saved collection. **It can happen on each eligible save without a separate confirmation once a key and access are configured.**

Screenshots, page-body text and browser-history search results are not sent by these AI tools. Sensitive information can still appear in URLs, titles or notes. Requests go directly to your configured provider, which applies its own retention, processing and billing rules. See the [privacy policy](../extension/privacy.html).

## Limits, cancellation and Undo

Collection organisation accepts 1–300 links. Topic groups need at least two related items; isolated items may stay ungrouped. Grouping is not a promise to reorder every link or rename every tab.

If the provider returns malformed output or invalid group references, LeoTabs may send one correction request with the same metadata. This applies to collection, open-tab and switcher grouping. That additional request can incur provider usage. Organisation normally applies directly and offers Undo. If the collection or live tabs change during the request, the result can be rejected instead of applying stale changes.

Cancel stops a pending request locally where supported. Cancel and Undo cannot retract information already delivered to a provider or reverse its charges.

## Troubleshoot a connection

| Symptom | Check |
| --- | --- |
| Add your API key / access not enabled | Correct provider selected, key saved, origin permission granted |
| HTTP 401 or 403 | Key validity, account/project permissions and available model |
| HTTP 404 or model not found | Exact model identifier and full custom endpoint route |
| HTTP 429 | Provider quota, billing limit or temporary rate limit; wait before retrying |
| Timeout / network failure | Provider availability, firewall/VPN and local server running if applicable |
| Invalid JSON / unknown link | Try again on a smaller, unchanged collection; try a model with reliable JSON output |
| Collection changed while AI was working | Finish edits or dragging, then run the action again |
| No automatic name | Saved key and access required, 1–300 links, and no intervening manual name/content change |

If you suspect a key was exposed, revoke it at the provider. **Forget AI key** removes the local saved copy for the selected connection. **Privacy & permissions → Revoke access** removes optional website access. To clear several saved providers, visit and forget each one. For further help, send the error and provider/model names to support, never the key.
