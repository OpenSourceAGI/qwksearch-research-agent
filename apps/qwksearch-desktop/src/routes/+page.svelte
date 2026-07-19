<script lang="text/javascript">
  import { onMount } from "svelte";
  import { readText, writeText } from "@tauri-apps/plugin-clipboard-manager";
  import { listen } from "@tauri-apps/api/event";
  import { invoke } from "@tauri-apps/api/core";
  import { open, Command } from "@tauri-apps/plugin-shell";
  import { enable, isEnabled, disable } from "@tauri-apps/plugin-autostart";

  let selectedText = "No text selected";
  let lastSearchTime = 0; //should this be stored in settings?
 
  const defaultSearchEngine = "QwkSearch";

  const searchEngines = {
    QwkSearch: "https://www.qwksearch.com/?q=",
    // Perplexity: "https://www.perplexity.ai/?q=",
    // Google: "https://www.google.com/search?q=",
    // "Go To First": "https://duckduckgo.com/?q=%5C",
    // DuckDuckGo: "https://duckduckgo.com/?q=",
    // Youtube: "https://www.youtube.com/results?search_query=",

  };

  async function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }


  async function openWebSearch(query) {
    var url = searchEngines[defaultSearchEngine] + encodeURIComponent(query);
    await open(url);

    //sometimes the Terminal window pops up
    await Command.create("exit").execute()
  }

  onMount(async () => {

    //autostart
    await enable(); 

    await listen("shortcut-triggered", async (data) => {
        const currentTime = Date.now();

      // Prevent multiple searches opens in quick succession 
      if (currentTime - lastSearchTime < 2000) 
        return;

      await sleep(500);
      //get from clipboard
      selectedText = await readText();

      if (selectedText) {
        lastSearchTime = currentTime;
        
        await openWebSearch(selectedText);
      } else {
        await openWebSearch("");
      }
    });
  });
</script>

<div class="container">
  <p>
    Press ` Backquote Key (under Esc) to open to search web for selected text.
  </p>

  <div class="selected-text">
    <h2>Selected Text:</h2>
    <p>{selectedText}</p>
  </div>
</div>

<style>
  .container {
    font-family: Arial, sans-serif;
    max-width: 800px;
    margin: 0 auto;
    padding: 2em;
    text-align: center;
  }

  .selected-text {
    margin-top: 2em;
    padding: 1em;
    background-color: #f0f0f0;
    border-radius: 8px;
    max-width: 80%;
    margin-left: auto;
    margin-right: auto;
  }

  .selected-text h2 {
    margin-top: 0;
  }

  @media (prefers-color-scheme: dark) {
    .selected-text {
      background-color: #3f3f3f;
    }
  }
</style>
