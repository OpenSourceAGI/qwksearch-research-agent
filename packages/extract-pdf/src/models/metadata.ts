/**
 * @description Normalised PDF document metadata (title, author, creator, producer).
 * Handles both the modern XMP `metadata` API and the legacy `info` dictionary
 * returned by pdfjs, so callers always receive a consistent shape regardless of
 * which metadata format the PDF uses.
 */
// Metadata of the PDF document
export default class Metadata {
  title?: string;
  creator?: string;
  producer?: string;
  author?: string;

  constructor(originalMetadata: {
    metadata?: { get(key: string): string | undefined };
    info?: { Title?: string; Author?: string; Creator?: string; Producer?: string };
  }) {
    if (originalMetadata.metadata) {
      this.title = originalMetadata.metadata.get("dc:title");
      this.creator = originalMetadata.metadata.get("xap:creatortool");
      this.producer = originalMetadata.metadata.get("pdf:producer");
    } else {
      this.title = originalMetadata.info?.Title;
      this.author = originalMetadata.info?.Author;
      this.creator = originalMetadata.info?.Creator;
      this.producer = originalMetadata.info?.Producer;
    }
  }
}
