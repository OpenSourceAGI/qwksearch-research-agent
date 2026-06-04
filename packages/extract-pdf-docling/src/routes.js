/**
 * @file routes.js
 * @description OpenAPI route definitions for the Granite Docling API.
 * Handlers are registered in pdf2html.js via `app.openapi(route, handler)`.
 */
import { createRoute } from "@hono/zod-openapi";
import {
    ConvertImageBodySchema,
    ConvertImageBase64BodySchema,
    ConvertImageResponseSchema,
    ErrorResponseSchema,
    HealthResponseSchema,
} from "./schemas.js";

/** Reusable 400/500 error response spec. */
const errorResponses = {
    400: {
        content: { "application/json": { schema: ErrorResponseSchema } },
        description: "Bad request",
    },
    500: {
        content: { "application/json": { schema: ErrorResponseSchema } },
        description: "Internal server error",
    },
};

/**
 * POST /api/v1/convert
 * Converts an image URL to docling format.
 */
export const convertImageRoute = createRoute({
    method: "post",
    path: "/api/v1/convert",
    tags: ["Document Conversion"],
    summary: "Convert image to docling format",
    description: "Converts an image URL to docling format using the Granite Docling model",
    request: {
        body: {
            content: { "application/json": { schema: ConvertImageBodySchema } },
        },
    },
    responses: {
        200: {
            content: { "application/json": { schema: ConvertImageResponseSchema } },
            description: "Successful conversion",
        },
        ...errorResponses,
    },
});

/**
 * POST /api/v1/convert-base64
 * Converts a base64-encoded image to docling format.
 */
export const convertImageBase64Route = createRoute({
    method: "post",
    path: "/api/v1/convert-base64",
    tags: ["Document Conversion"],
    summary: "Convert base64 image to docling format",
    description: "Converts a base64 encoded image to docling format using the Granite Docling model",
    request: {
        body: {
            content: { "application/json": { schema: ConvertImageBase64BodySchema } },
        },
    },
    responses: {
        200: {
            content: { "application/json": { schema: ConvertImageResponseSchema } },
            description: "Successful conversion",
        },
        ...errorResponses,
    },
});

/**
 * GET /health
 * Returns service status, model readiness, and uptime.
 */
export const healthRoute = createRoute({
    method: "get",
    path: "/health",
    tags: ["System"],
    summary: "Health check",
    description: "Check if the service is running and model is loaded",
    responses: {
        200: {
            content: { "application/json": { schema: HealthResponseSchema } },
            description: "Health check response",
        },
    },
});
