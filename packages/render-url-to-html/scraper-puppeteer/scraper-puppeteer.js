/**
 * @module crawler
 * @description A webpage proxy that request through Chromium (puppeteer) - can be used
 * to bypass Cloudflare anti bot on any application (like curl)
 * Send your request to the server with the port 3000 and add your URL to the "url"
 *  query string like this: `http://localhost:3000/?url=https://example.org`
 * 
 * 
 * https://github.com/ZFC-Digital/puppeteer-real-browser
 *
 * https://github.com/rebrowser/rebrowser-puppeteer
 */

import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
puppeteer.use(StealthPlugin()); // Use stealth plugin to make puppeteer harder to detect
 
// Add adblocker plugin to block all ads and trackers (saves bandwidth)
// const AdblockerPlugin = require("puppeteer-extra-plugin-adblocker");
// puppeteer.use(AdblockerPlugin({  }));

// Import Koa and its middleware
import Koa from "koa";
import bodyParser from "koa-bodyparser";
const app = new Koa(); // Create a new Koa application
app.use(bodyParser()); // Use body parser middleware

// Import jsesc for escaping JavaScript strings
import jsesc from "jsesc";

// Define headers to be removed from requests and responses
const requestHeadersToRemove = [
  "host",
  "user-agent",
  "accept-encoding",
  "content-length",
  "forwarded",
  "x-forwarded-proto",
  "x-forwarded-for",
  "x-cloud-trace-context",
];
const responseHeadersToRemove = [
  "Accept-Ranges",
  "Content-Length",
  "Keep-Alive",
  "Connection",
  "content-encoding",
  "set-cookie",
];

// Main application logic
// Set up Puppeteer options
let options = {
  headless: "new", // Use new headless mode
  args: ["--no-sandbox", "--disable-setuid-sandbox"], // Security-related arguments
};

  options.executablePath = "/usr/bin/chromium-browser";
if (process.env.PROXY_URL)
  options.args.push(`--proxy-server=`+process.env.PROXY_URL);


// Launch the browser
const browser = await puppeteer.launch(options);

// Set up Koa middleware
app.use(async (ctx) => {
  if (ctx.query.url) {
    // Extract and decode the URL from the query string
    const url = decodeURIComponent(ctx.url.replace("/?url=", ""));
    const optionWait = ctx.query.wait || 0;
    
    

    // Initialize variables for response data
    let responseBody;
    let responseData;
    let responseHeaders;



  // Create a new page
    const page = await browser.newPage();

  
    //login to proxy      
    if (process.env.PROXY_USER)
      await page.authenticate({
          username: process.env.PROXY_USER,
          password: process.env.PROXY_PASS,
      });

    // await page.goto('https://fingerprint.scrapoxy.io');

    // const content = await page.content();
    // console.log(content);



    // Set up request interception
    await page.removeAllListeners("request");
    await page.setRequestInterception(true);

    let requestHeaders = ctx.headers;
    requestHeadersToRemove.forEach((header) => {
      delete requestHeaders[header];
    });

    // Handle each intercepted request
    page.on("request", (request) => {
      //no downloading images/css in the virtual renderer saves time
      // if (["image", "stylesheet", "font"].includes(request.resourceType()))
      //   return request.abort();

        requestHeaders = Object.assign({}, request.headers(), requestHeaders);
      
        if (ctx.method == "POST") {
          request.continue({
            headers: requestHeaders,
            method: "POST",
            postData: ctx.request.rawBody,
          });
        } else {
          request.continue({ headers: requestHeaders });
        }
    });

    // Set up CDP session for more control over the browser
    const client = await page.target().createCDPSession();
    await client.send("Network.setRequestInterception", {
      patterns: [
        {
          urlPattern: "*",
          resourceType: "Document",
          interceptionStage: "HeadersReceived",
        },
      ],
    });

    // Handle intercepted responses
    await client.on("Network.requestIntercepted", async (e) => {
      let obj = { interceptionId: e.interceptionId };
      if (e.isDownload) {
        await client
          .send("Network.getResponseBodyForInterception", {
            interceptionId: e.interceptionId,
          })
          .then((result) => {
            if (result.base64Encoded) {
              responseData = Buffer.from(result.body, "base64");
            }
          });
        obj["errorReason"] = "BlockedByClient";
        responseHeaders = e.responseHeaders;
      }
      await client.send("Network.continueInterceptedRequest", obj);
      if (e.isDownload) await page.close();
    });

    try {
      // Navigate to the URL and handle potential challenges
      let response;
      let tryCount = 0;
      response = await page.goto(url, {
        timeout: 5000,
        waitUntil: "domcontentloaded",
      });

      if (optionWait) {
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }

      ctx.status = response.status();
      responseBody = await response.text();
      responseData = await response.buffer();
      while (
        responseBody.includes(
          process.env.CHALLENGE_MATCH || "challenge-platform"
        ) &&
        tryCount <= 10
      ) {
        newResponse = await page.waitForNavigation({
          timeout: 5000,
          waitUntil: "domcontentloaded",
        });
        if (newResponse) response = newResponse;
        responseBody = await response.text();
        responseData = await response.buffer();
        tryCount++;
      }
      responseHeaders = await response.headers();

      // Handle cookies
      const cookies = await page.cookies();
      if (cookies)
        cookies.forEach((cookie) => {
          const { name, value, secure, expires, domain, ...options } = cookie;
          ctx.cookies.set(cookie.name, cookie.value, options);
        });
    } catch (error) {
      // Handle errors
      if (!error.toString().includes("ERR_BLOCKED_BY_CLIENT")) {
        ctx.status = 500;
        ctx.body = error;
      }
    }

    // Close the page
    await page.close();

    // Process response headers
    if (responseHeaders) {
      responseHeadersToRemove.forEach(
        (header) => delete responseHeaders[header]
      );
      Object.keys(responseHeaders).forEach((header) =>
        ctx.set(header, jsesc(responseHeaders[header]))
      );
    }


    //spoof the base-url for relative paths on the target page
    //split url to domain
    responseData = (responseBody || "").replace(
      /<head[^>]*>/i,
      "<head><base href='" + url.split("/").slice(0, 3).join("/") + "/'>"
    );

    ctx.body = responseData;
  } else {
    // If no URL is provided, return an error message
    ctx.body = "Please specify the URL in the 'url' query string.";
  }
});

// Start the server
app.listen(process.env.PORT || 3000, process.env.ADDRESS || "::");
