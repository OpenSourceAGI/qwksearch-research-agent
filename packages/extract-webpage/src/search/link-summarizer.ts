/**
 * @module research/search/link-summarizer
 * @description Groups link documents by URL then summarizes each group with an LLM.
 */
import { Document } from "@langchain/core/documents";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { buildFallbackDocs } from "./doc-utils";

const SUMMARIZER_PROMPT = `You are a web search summarizer, tasked with summarizing a piece of text retrieved from a web search. Your job is to summarize the
text into a detailed, 2-4 paragraph explanation that captures the main ideas and provides a comprehensive answer to the query.
If the query is "summarize", you should provide a detailed summary of the text. If the query is a specific question, you should answer it in the summary.

- **Journalistic tone**: The summary should sound professional and journalistic, not too casual or vague.
- **Thorough and detailed**: Ensure that every key point from the text is captured and that the summary directly answers the query.
- **Not too lengthy, but detailed**: The summary should be informative but not excessively long. Focus on providing detailed information in a concise format.

The text will be shared inside the \`text\` XML tag, and the query inside the \`query\` XML tag.

<example>
1. \`<text>
Docker is a set of platform-as-a-service products that use OS-level virtualization to deliver software in packages called containers.
It was first released in 2013 and is developed by Docker, Inc. Docker is designed to make it easier to create, deploy, and run applications
by using containers.
</text>

<query>
What is Docker and how does it work?
</query>

Response:
Docker is a revolutionary platform-as-a-service product developed by Docker, Inc., that uses container technology to make application
deployment more efficient. It allows developers to package their software with all necessary dependencies, making it easier to run in
any environment. Released in 2013, Docker has transformed the way applications are built, deployed, and managed.
\`
2. \`<text>
The theory of relativity, or simply relativity, encompasses two interrelated theories of Albert Einstein: special relativity and general
relativity. However, the word "relativity" is sometimes used in reference to Galilean invariance. The term "theory of relativity" was based
on the expression "relative theory" used by Max Planck in 1906. The theory of relativity usually encompasses two interrelated theories by
Albert Einstein: special relativity and general relativity. Special relativity applies to all physical phenomena in the absence of gravity.
General relativity explains the law of gravitation and its relation to other forces of nature. It applies to the cosmological and astrophysical
realm, including astronomy.
</text>

<query>
summarize
</query>

Response:
The theory of relativity, developed by Albert Einstein, encompasses two main theories: special relativity and general relativity. Special
relativity applies to all physical phenomena in the absence of gravity, while general relativity explains the law of gravitation and its
relation to other forces of nature. The theory of relativity is based on the concept of "relative theory," as introduced by Max Planck in
1906. It is a fundamental theory in physics that has revolutionized our understanding of the universe.
\`
</example>

Everything below is the actual data you will be working with. Good luck!

<query>
{question}
</query>

<text>
{content}
</text>

Make sure to answer the query in the summary.`;

/**
 * Groups fetched link documents by URL (max 10 chunks per URL), then
 * summarizes each group with the LLM in parallel.
 */
export async function groupAndSummarizeDocs(
  llm: BaseChatModel,
  linkDocs: Document[],
  question: string,
): Promise<Document[]> {
  // Group chunks by URL, capping at 10 chunks each
  const docGroups: Document[] = [];

  for (const doc of linkDocs) {
    const existing = docGroups.find(
      (d) => d.metadata.url === doc.metadata.url && d.metadata.totalDocs < 10,
    );

    if (!existing) {
      docGroups.push({ ...doc, metadata: { ...doc.metadata, totalDocs: 1 } });
    } else {
      existing.pageContent += `\n\n${doc.pageContent}`;
      existing.metadata.totalDocs += 1;
    }
  }

  // Summarize each group in parallel
  const docs: Document[] = [];

  await Promise.all(
    docGroups.map(async (doc) => {
      const prompt = SUMMARIZER_PROMPT.replace("{question}", question).replace(
        "{content}",
        doc.pageContent,
      );
      const res = await llm.invoke(prompt);

      docs.push(
        new Document({
          pageContent: res.content as string,
          metadata: { title: doc.metadata.title, url: doc.metadata.url },
        }),
      );
    }),
  );

  return docs.length > 0 ? docs : buildFallbackDocs(question);
}
