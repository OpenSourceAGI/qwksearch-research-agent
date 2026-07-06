/**
 * Test grab-url directly to see what it returns
 */
import grab from "grab-url";

async function testGrabUrl() {
  console.log("Testing grab-url directly...\n");

  const testUrl = "https://httpbin.org/html";

  try {
    console.log(`Fetching: ${testUrl}`);
    const result = await grab(testUrl, { responseType: "text", timeout: 10 });

    console.log(`\nResult type: ${typeof result}`);
    console.log(`Result is string: ${typeof result === "string"}`);
    console.log(`Result length: ${typeof result === "string" ? result.length : "N/A"}`);

    if (typeof result === "object") {
      console.log(`Result object keys:`, Object.keys(result));
      console.log(`Result object:`, JSON.stringify(result, null, 2));
    }

    if (typeof result === "string") {
      console.log(`Result preview:`, result.substring(0, 200));
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

testGrabUrl().catch(console.error);
