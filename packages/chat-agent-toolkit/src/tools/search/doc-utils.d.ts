/**
 * @module research/search/doc-utils
 * @description Document utilities: fallback docs, reranking, and formatting.
 */
import type { Document } from "./document";
export interface R2CredentialsInput {
    accountId: string;
    accessKeyId: string;
    secretAccessKey: string;
    bucket: string;
}
export declare function buildFallbackDocs(query: string): Document[];
export declare function normalizeSourcesOutput(output: unknown, query: string): Document[];
/** The payload resolved for an uploaded fileId. */
export interface LoadedUpload {
    title: string;
    content: string;
    /** MIME type for image uploads (e.g. `"image/png"`). */
    mediaType?: string;
    /** `data:`/`http(s)` URL of an image upload, passed to the LLM as image content. */
    image?: string;
}
/** An image attachment resolved from an uploaded fileId. */
export interface UploadImageAttachment {
    mediaType: string;
    /** `data:`/`http(s)` URL of the image, ready for an AI SDK image content part. */
    image: string;
}
/**
 * Resolves an uploaded fileId to its extracted payload. Hosts register a loader
 * (e.g. reading the native R2 binding) so the search pipeline does not depend
 * on filesystem or credential-based access. Image uploads additionally carry
 * `mediaType` and `image` so they can be passed to the LLM directly.
 */
export type UploadFileLoader = (fileId: string) => Promise<LoadedUpload | null>;
/**
 * Registers the loader used by {@link rerankDocs} to resolve uploaded
 * fileIds to extracted content. The registered loader takes precedence over
 * the S3-credentials fallback.
 */
export declare function registerUploadFileLoader(loader: UploadFileLoader): void;
/**
 * Resolves every uploaded fileId once, in order — sequentially, so one raw
 * payload is live at a time, and once per request, with the result shared by
 * the reranker and the image loader.
 */
export declare function loadUploads(fileIds: string[], r2Credentials?: R2CredentialsInput): Promise<LoadedUpload[]>;
/**
 * Picks the image attachments out of already-resolved uploads, ready to be
 * passed to the LLM as image content parts.
 */
export declare function selectUploadImages(uploads: LoadedUpload[]): UploadImageAttachment[];
/**
 * Resolves image attachments for the given uploaded fileIds so they can be
 * passed to the LLM as image content parts. Non-image uploads (documents) and
 * images stored without inline data are skipped.
 */
export declare function loadUploadImages(fileIds: string[], r2Credentials?: R2CredentialsInput, preloaded?: LoadedUpload[]): Promise<UploadImageAttachment[]>;
/**
 * Builds the answer context: uploaded file content first, then web results.
 */
export declare function rerankDocs(query: string, docs: Document[], fileIds: string[], optimizationMode: "speed" | "balanced" | "quality", r2Credentials?: R2CredentialsInput, preloaded?: LoadedUpload[]): Promise<Document[]>;
export declare function processDocs(docs: Document[]): string;
