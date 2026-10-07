# SearXNG on Cloudflare Workers + Containers

A Worker fronts a SearXNG (Python) container run by [Cloudflare Containers](https://developers.cloudflare.com/containers/). The container starts on demand and **sleeps after 1 minute idle** (`sleepAfter = "1m"` in [src/index.ts](src/index.ts)), so you're billed only for active time.

Cost levers (see [wrangler.jsonc](wrangler.jsonc)):
- `instance_type: "lite"` – smallest instance (use `"basic"` if it runs out of memory)
- `max_instances: 2` – caps concurrency/spend
- `sleepAfter: "1m"` – scale to zero quickly

Requires the Workers Paid plan and Docker running locally.

## Deploy

```bash
cd cloudflare
npm install
npx wrangler login
# Optional: protect the endpoint
npx wrangler secret put API_TOKEN
npm run deploy
```

The first deploy builds the image from [Dockerfile](Dockerfile) (context = parent dir, so it uses `../searxng-settings.yml`) and pushes it to Cloudflare's registry. Provisioning can take a few minutes.

## Use

```bash
curl -H "Authorization: Bearer $API_TOKEN" \
  "https://searxng-search.<your-subdomain>.workers.dev/search?q=hello&format=json"
```

The first request after idle has a cold start (a few seconds); later ones are fast. JSON output is enabled in `searxng-settings.yml`.

## Notes
- Change `secret_key` in `../searxng-settings.yml` before deploying publicly.
- Local dev: `npm run dev` (needs Docker).
