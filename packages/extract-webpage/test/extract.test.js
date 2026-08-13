import { test, expect } from "vitest";
// import { convertYoutubeToText } from "../src/extractor/url-to-content/youtube-to-text";
import { extractContent } from "../src/extractor/url-to-content/url-to-content";
test("extract url", async () => {
  let urls = [
    "https://www.independent.org/pdf/tir/tir_10_1_2_pennington.pdf",
    // "https://www.youtube.com/watch?time_continue=4828&v=scDMh_32r9M&embeds_referring_euri=https%3A%2F%2Fdebate-ai.com%2F&source_ve_path=Mjg2NjY",
    // "https://www.cnn.com/2024/07/26/politics/video/kamala-harris-barack-michelle-obama-endorsement-president-ctm-ldn-digvid",
    // "https://iep.utm.edu/republic/",
    //   "https://www.technologyreview.com/2024/07/30/1095489/openai-has-released-a-new-chatgpt-bot-that-you-can-talk-to/",
    //   "https://www.youtube.com/watch?v=OsW_kdOV6c8",
    //   "https://arxiv.org/pdf/1706.03762"
  ];

  for (var url of urls) {
    var result = await extractContent(url);
    console.log(result);
  }

  expect(result).toBeDefined();
}, 100000);

var extractURLs = [
  // "https://www.computerworld.com/article/3496192/court-handcuffs-employees-with-non-compete-agreements-again.html",
  // "https://en.wikipedia.org/wiki/David_Hilbert",
  // "https://blog.jgc.org/2024/09/steve-ballmers-binary-search-interview.html"
  // "https://www.cnn.com/2024/07/26/politics/video/kamala-harris-barack-michelle-obama-endorsement-president-ctm-ldn-digvid",
  // "https://www.technologyreview.com/2024/07/30/1095489/openai-has-released-a-new-chatgpt-bot-that-you-can-talk-to/",
];
// test("readability - should extract content from HTML", async () => {
//   for (var url of extractURLs){

//   var html = await (await fetch(url)).text();

//   // var content = extract(html, {url});
//   var content = extractContentAndCite(html);
//   console.log(content);

//   }

//   expect(content).toBeDefined();
// });
