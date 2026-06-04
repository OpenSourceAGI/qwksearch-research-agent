/**
 * @file schemas.js
 * @description Zod schemas shared across route definitions and handlers.
 */
import { z } from "@hono/zod-openapi";

/**
 * Request body for the URL-based conversion endpoint.
 */
export const ConvertImageBodySchema = z.object({
    imageUrl: z.string().url().describe("URL of the image to convert"),
    prompt: z
        .string()
        .optional()
        .default("Convert this page to docling.")
        .describe("Custom prompt for conversion"),
    maxTokens: z
        .number()
        .int()
        .min(1)
        .max(8192)
        .optional()
        .default(4096)
        .describe("Maximum number of tokens to generate"),
    streaming: z
        .boolean()
        .optional()
        .default(false)
        .describe("Enable streaming response"),
});

/**
 * Request body for the base64-encoded image conversion endpoint.
 */
export const ConvertImageBase64BodySchema = z.object({
    imageBase64: z.string().describe("Base64 encoded image"),
    mimeType: z
        .string()
        .optional()
        .default("image/png")
        .describe("MIME type of the image"),
    prompt: z
        .string()
        .optional()
        .default("Convert this page to docling.")
        .describe("Custom prompt for conversion"),
    maxTokens: z
        .number()
        .int()
        .min(1)
        .max(8192)
        .optional()
        .default(4096)
        .describe("Maximum number of tokens to generate"),
    streaming: z
        .boolean()
        .optional()
        .default(false)
        .describe("Enable streaming response"),
});

/**
 * Successful conversion response.
 */
export const ConvertImageResponseSchema = z.object({
    success: z.boolean(),
    result: z.string().describe("Converted docling text"),
    metadata: z.object({
        processingTime: z.number().describe("Processing time in milliseconds"),
        tokenCount: z.number().optional().describe("Number of tokens generated"),
    }),
});

/**
 * Error response returned by all endpoints on failure.
 */
export const ErrorResponseSchema = z.object({
    success: z.boolean().default(false),
    error: z.string(),
    code: z.string().optional(),
});

/**
 * Health check response.
 */
export const HealthResponseSchema = z.object({
    status: z.string(),
    modelLoaded: z.boolean(),
    uptime: z.number(),
    version: z.string(),
});
