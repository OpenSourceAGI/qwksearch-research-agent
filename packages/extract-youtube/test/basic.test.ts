/**
 * @fileoverview Basic usage examples for YouTube Transcript API
 */

import {
  YouTubeTranscriptApi,
  SRTFormatter,
  WebVTTFormatter,
  JSONFormatter,
  NoTranscriptFound,
  TranscriptsDisabled,
} from "../src";

/**
 * Example 1: Fetch a transcript with default settings
 */
async function example1() {
  console.log("\n=== Example 1: Basic Fetch ===");

  const api = new YouTubeTranscriptApi();

  try {
    const transcript = await api.fetch("xz-DTHwRMDo");

    console.log(`Video ID: ${transcript.videoId}`);
    console.log(
      `Language: ${transcript.language} (${transcript.languageCode})`,
    );
    console.log(`Auto-generated: ${transcript.isGenerated}`);
    console.log(`Snippets: ${transcript.length}\n`);

    // Print first 3 snippets
    for (let i = 0; i < Math.min(40, transcript.length); i++) {
      const snippet = transcript.get(i);
      console.log(`[${snippet.start.toFixed(2)}s] ${snippet.text}`);
    }
  } catch (error: any) {
    console.error("Error type:", error.constructor?.name || typeof error);
    console.error("Error message:", error.message);
    console.error("Full error:", error);
    if (error.stack) {
      console.error("\nStack trace:");
      console.error(error.stack);
    }
  }
}

/**
 * Example 2: List available transcripts
 */
async function example2() {
  console.log("\n=== Example 2: List Available Transcripts ===");

  const api = new YouTubeTranscriptApi();

  try {
    const transcriptList = await api.list("dQw4w9WgXcQ");

    console.log("Available transcripts:");
    for (const transcript of transcriptList) {
      console.log(
        `- ${transcript.language} (${transcript.languageCode}) ` +
          `[${transcript.isGenerated ? "Auto" : "Manual"}]` +
          `${transcript.isTranslatable ? " [Translatable]" : ""}`,
      );
    }
  } catch (error: any) {
    console.error("Error:", error.message);
  }
}

/**
 * Example 3: Fetch with language preference
 */
async function example3() {
  console.log("\n=== Example 3: Language Preference ===");

  const api = new YouTubeTranscriptApi();

  try {
    // Try German first, then English
    const transcript = await api.fetch("dQw4w9WgXcQ", {
      languages: ["de", "en"],
    });

    console.log(`Found: ${transcript.language} (${transcript.languageCode})`);
  } catch (error: any) {
    if (error instanceof NoTranscriptFound) {
      console.error("No transcript found for requested languages");
    } else {
      console.error("Error:", error.message);
    }
  }
}

/**
 * Example 4: Translate a transcript
 */
async function example4() {
  console.log("\n=== Example 4: Translate Transcript ===");

  const api = new YouTubeTranscriptApi();

  try {
    const transcriptList = await api.list("dQw4w9WgXcQ");

    // Find English transcript
    const englishTranscript = transcriptList.findTranscript(["en"]);
    console.log(`Original: ${englishTranscript.language}`);

    if (englishTranscript.isTranslatable) {
      // Translate to German
      const germanTranscript = englishTranscript.translate("de");
      const fetched = await germanTranscript.fetch();

      console.log(
        `Translated to: ${fetched.language} (${fetched.languageCode})`,
      );
      console.log(`First snippet: ${fetched.get(0).text}`);
    }
  } catch (error: any) {
    console.error("Error:", error.message);
  }
}

/**
 * Example 5: Format as SRT
 */
async function example5() {
  console.log("\n=== Example 5: Format as SRT ===");

  const api = new YouTubeTranscriptApi();

  try {
    const transcript = await api.fetch("dQw4w9WgXcQ");

    const formatter = new SRTFormatter();
    const srt = formatter.formatTranscript(transcript);

    // Print first 200 characters
    console.log(srt.substring(0, 200) + "...\n");
  } catch (error: any) {
    console.error("Error:", error.message);
  }
}

/**
 * Example 6: Format as WebVTT
 */
async function example6() {
  console.log("\n=== Example 6: Format as WebVTT ===");

  const api = new YouTubeTranscriptApi();

  try {
    const transcript = await api.fetch("dQw4w9WgXcQ");

    const formatter = new WebVTTFormatter();
    const webvtt = formatter.formatTranscript(transcript);

    // Print first 200 characters
    console.log(webvtt.substring(0, 200) + "...\n");
  } catch (error: any) {
    console.error("Error:", error.message);
  }
}

/**
 * Example 7: Format as JSON
 */
async function example7() {
  console.log("\n=== Example 7: Format as JSON ===");

  const api = new YouTubeTranscriptApi();

  try {
    const transcript = await api.fetch("dQw4w9WgXcQ");

    const formatter = new JSONFormatter();
    const json = formatter.formatTranscript(transcript, { indent: 2 });

    // Print first 300 characters
    console.log(json.substring(0, 300) + "...\n");
  } catch (error: any) {
    console.error("Error:", error.message);
  }
}

/**
 * Example 8: Error handling
 */
async function example8() {
  console.log("\n=== Example 8: Error Handling ===");

  const api = new YouTubeTranscriptApi();

  try {
    // Try to fetch transcript for a video without subtitles
    const transcript = await api.fetch("invalid-video-id");
  } catch (error: any) {
    if (error instanceof TranscriptsDisabled) {
      console.error("Subtitles are disabled for this video");
    } else if (error instanceof NoTranscriptFound) {
      console.error("No transcript found for requested languages");
    } else {
      console.error(`Error type: ${error.constructor.name}`);
      console.error(`Message: ${error.message}`);
    }
  }
}

/**
 * Example 9: Iterate and filter
 */
async function example9() {
  console.log("\n=== Example 9: Iterate and Filter ===");

  const api = new YouTubeTranscriptApi();

  try {
    const transcript = await api.fetch("dQw4w9WgXcQ");

    // Find snippets containing a specific word
    const searchWord = "you";
    let count = 0;

    for (const snippet of transcript) {
      if (snippet.text.toLowerCase().includes(searchWord)) {
        count++;
        if (count <= 3) {
          console.log(`[${snippet.start.toFixed(2)}s] ${snippet.text}`);
        }
      }
    }

    console.log(`\nFound "${searchWord}" in ${count} snippets`);
  } catch (error: any) {
    console.error("Error:", error.message);
  }
}

/**
 * Example 10: Get raw data
 */
async function example10() {
  console.log("\n=== Example 10: Raw Data ===");

  const api = new YouTubeTranscriptApi();

  try {
    const transcript = await api.fetch("dQw4w9WgXcQ");

    // Get raw data as plain objects
    const rawData = transcript.toRawData();

    console.log("Raw data (first 3 items):");
    console.log(JSON.stringify(rawData.slice(0, 3), null, 2));
  } catch (error: any) {
    console.error("Error:", error.message);
  }
}

// Run all examples
async function main() {
  console.log("YouTube Transcript API - Usage Examples");
  console.log("======================================");

  await example1();
  // await example2();
  // await example3();
  // await example4();
  // await example5();
  // await example6();
  // await example7();
  // await example8();
  // await example9();
  // await example10();

  console.log("\n=== All examples completed ===\n");
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

export {
  example1,
  example2,
  example3,
  example4,
  example5,
  example6,
  example7,
  example8,
  example9,
  example10,
};
