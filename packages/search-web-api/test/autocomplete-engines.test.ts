/**
 * Autocomplete Example
 *
 * Demonstrates how to use the autocomplete functionality
 * to get search query suggestions from various search engines.
 */

import {
  searchAutocomplete,
  searchAutocompleteMulti,
  backends,
  // Individual backend functions
  google,
  duckduckgo,
  brave,
  wikipedia,
  baidu,
  qwant,
  startpage,
  yandex,
} from "../src/suggest-next-words/autocomplete-search-engines";

async function main() {
  console.log("=== Search Autocomplete Examples ===\n");

  // Example 1: Single backend autocomplete
  console.log('Example 1: Google autocomplete for "typescript"');
  const googleSuggestions = await searchAutocomplete("google", "typescript");
  console.log("Suggestions:", googleSuggestions);
  console.log("");

  // Example 2: DuckDuckGo autocomplete
  console.log('Example 2: DuckDuckGo autocomplete for "javascript"');
  const ddgSuggestions = await searchAutocomplete("duckduckgo", "javascript");
  console.log("Suggestions:", ddgSuggestions);
  console.log("");

  // Example 3: Wikipedia autocomplete with locale
  console.log('Example 3: Wikipedia autocomplete for "quantum" (English)');
  const wikiSuggestions = await searchAutocomplete(
    "wikipedia",
    "quantum",
    "en-US"
  );
  console.log("Suggestions:", wikiSuggestions);
  console.log("");

  // Example 4: Multi-backend autocomplete
  console.log('Example 4: Multi-backend autocomplete for "python"');
  const multiSuggestions = await searchAutocompleteMulti(
    ["google", "duckduckgo", "wikipedia"],
    "python"
  );
  console.log("Merged suggestions:", multiSuggestions);
  console.log("Total unique suggestions:", multiSuggestions.length);
  console.log("");

  // Example 5: Using backend functions directly
  console.log("Example 5: Direct backend function calls");

  console.log('\nGoogle suggestions for "react":');
  const reactGoogle = await google("react");
  console.log(reactGoogle);

  console.log('\nBrave suggestions for "node":');
  const nodeBrave = await brave("node");
  console.log(nodeBrave);

  console.log('\nWikipedia suggestions for "artificial intelligence":');
  const aiWiki = await wikipedia("artificial intelligence", "en");
  console.log(aiWiki);
  console.log("");

  // Example 6: Autocomplete with different locales
  console.log("Example 6: Locale-specific autocomplete");

  console.log("\nGoogle (English):");
  const enGoogle = await google("machine learning", "en");
  console.log(enGoogle.slice(0, 5));

  console.log("\nGoogle (German):");
  const deGoogle = await google("machine learning", "de");
  console.log(deGoogle.slice(0, 5));

  console.log("\nGoogle (French):");
  const frGoogle = await google("machine learning", "fr");
  console.log(frGoogle.slice(0, 5));
  console.log("");

  // Example 7: List all available backends
  console.log("Example 7: Available autocomplete backends");
  const availableBackends = Object.keys(backends);
  console.log("Available backends:", availableBackends);
  console.log("Total:", availableBackends.length);
  console.log("");

  // Example 8: Comparing results from different backends
  console.log('Example 8: Comparing autocomplete results for "climate change"');
  const query = "climate change";

  for (const backendName of ["google", "duckduckgo", "brave", "wikipedia"]) {
    const suggestions = await searchAutocomplete(backendName, query);
    console.log(`\n${backendName}: ${suggestions.length} suggestions`);
    console.log(
      suggestions
        .slice(0, 3)
        .map((s) => `  - ${s}`)
        .join("\n")
    );
  }
  console.log("");

  // Example 9: Asian language autocomplete
  console.log("Example 9: Chinese autocomplete with Baidu");
  const chineseSuggestions = await baidu("人工智能"); // "artificial intelligence" in Chinese
  console.log("Suggestions:", chineseSuggestions);
  console.log("");

  console.log("Example 10: Russian autocomplete with Yandex");
  const russianSuggestions = await yandex("программирование"); // "programming" in Russian
  console.log("Suggestions:", russianSuggestions);
  console.log("");

  console.log("=== Examples Complete ===");
}

// Run the examples
main().catch((error) => {
  console.error("Error running examples:", error);
  process.exit(1);
});
