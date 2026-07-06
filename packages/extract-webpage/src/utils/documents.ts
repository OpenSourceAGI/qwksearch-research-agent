import axios from 'axios';
import { splitTextIntoChunks, type Document } from '../search/document';

/** Strip HTML tags and decode entities \u2014 works in Cloudflare edge runtime */
function htmlToText(html: string): string {
  return html
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/(script|style)>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&[a-z#][a-z0-9]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export const getDocumentsFromLinks = async ({ links }: { links: string[] }) => {
  let docs: Document[] = [];

  await Promise.all(
    links.map(async (link) => {
      link =
        link.startsWith('http://') || link.startsWith('https://')
          ? link
          : `https://${link}`;

      try {
        const res = await axios.get(link, {
          responseType: 'arraybuffer',
        });

        const parsedText = htmlToText(res.data.toString('utf8'))
          .replace(/(\r\n|\n|\r)/gm, ' ')
          .replace(/\s+/g, ' ')
          .trim();

        const splittedText = splitTextIntoChunks(parsedText);
        const title = res.data
          .toString('utf8')
          .match(/<title.*>(.*?)<\/title>/)?.[1];

        const linkDocs: Document[] = splittedText.map((text) => ({
          pageContent: text,
          metadata: {
            title: title || link,
            url: link,
          },
        }));

        docs.push(...linkDocs);
      } catch (err) {
        console.error(
          'An error occurred while getting documents from links: ',
          err,
        );
        docs.push({
          pageContent: `Failed to retrieve content from the link: ${err}`,
          metadata: {
            title: 'Failed to retrieve content',
            url: link,
          },
        });
      }
    }),
  );

  return docs;
};
