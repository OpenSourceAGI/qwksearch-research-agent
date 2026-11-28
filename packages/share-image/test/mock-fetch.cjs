// Preloaded into the CLI process with --require so tests never touch the network.
//
// MOCK_FETCH_ROUTES is a JSON object keyed by "POST <image>" or "GET <url>". Each value is
// a response or a list of responses used in turn, with the last one repeating:
//   { status = 200, body = "", delay = 0, networkError }
// Every request is appended to the MOCK_FETCH_LOG file as one line of JSON.

const { appendFileSync } = require("node:fs");

const routes = JSON.parse(process.env.MOCK_FETCH_ROUTES);
const logPath = process.env.MOCK_FETCH_LOG;
const callCounts = new Map();
let inFlight = 0;

globalThis.fetch = async (url, init = {}) => {
	const method = init.method ?? "GET";
	const image = init.body?.get("image");
	const key = method === "POST" ? `POST ${image}` : `GET ${url}`;
	const route = routes[key];

	inFlight++;
	appendFileSync(
		logPath,
		`${JSON.stringify({
			key,
			method,
			url,
			image,
			contentType: init.body?.constructor.name,
			headers: init.headers,
			hasTimeout: init.signal instanceof AbortSignal,
			inFlight,
			unmatched: route === undefined,
		})}\n`,
	);

	try {
		if (route === undefined) {
			throw new Error(`unmatched mock request: ${key}`);
		}

		const responses = [route].flat();
		const count = callCounts.get(key) ?? 0;
		callCounts.set(key, count + 1);
		const { status = 200, body = "", delay = 0, networkError } = responses[Math.min(count, responses.length - 1)];

		if (delay > 0) {
			await new Promise(resolve => setTimeout(resolve, delay));
		}
		if (networkError) {
			throw new TypeError(networkError);
		}
		return new Response(typeof body === "string" ? body : JSON.stringify(body), { status });
	} finally {
		inFlight--;
	}
};
