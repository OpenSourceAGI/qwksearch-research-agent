/**
 * @fileoverview Simple test script for speech library
 * Run: tsx lib/speech/test.ts
 */
import { generateSpeech } from "./index";
import { writeFileSync } from "fs";

async function test() {
  console.log("Testing Kokoro TTS...");

  try {
    const result = await generateSpeech({
      text: "Hello from Kokoro! This is a test of the text to speech system.",
      provider: "kokoro",
      voice: "af_heart",
    });

    console.log("✓ Generated audio");
    console.log(`  Content-Type: ${result.contentType}`);
    console.log(`  Size: ${result.audio.byteLength} bytes`);

    // Save to file
    const buffer = Buffer.from(result.audio);
    writeFileSync("test-output.wav", buffer);
    console.log("✓ Saved to test-output.wav");

    console.log("\nSuccess! Play the file to verify audio quality.");
  } catch (error) {
    console.error("✗ Error:", error);
    process.exit(1);
  }
}

test();
