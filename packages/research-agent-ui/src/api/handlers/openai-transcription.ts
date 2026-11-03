/**
 * @fileoverview OpenAI-compatible speech-to-text adapter: `GET /v1/models` and
 * `POST /v1/audio/transcriptions`, the two endpoints a client configured with
 * an OpenAI-style "base URL + API key" (Kilo, for one) calls.
 *
 * This is a thin shape adapter around `transcribeAudio` — the same function
 * `/api/agent/transcript` runs — so both routes use one tier → Whisper model
 * mapping and one Workers AI call. What differs is the contract:
 *
 * - the caller must be authorized (the host decides how; see `authorize`),
 * - the tier is validated instead of silently falling back,
 * - only `response_format` `json` (or none) is accepted,
 * - the body is `{ text }` and errors use OpenAI's `{ error: { message, … } }`.
 *
 * Nothing here logs the audio or the transcript.
 */
import type { TranscriptDeps } from "../types";
import {
  DEFAULT_TRANSCRIPTION_MODEL,
  TRANSCRIPTION_MODELS,
  isTranscriptionModel,
  transcribeAudio,
} from "./transcript";

export type OpenAIAuthResult =
  | { authorized: true }
  | { authorized: false; status?: number; message: string };

export interface OpenAITranscriptionDeps extends TranscriptDeps {
  /**
   * Decides whether the request may use the API — e.g. by validating an
   * `Authorization: Bearer <key>` header. Runs before the body is read.
   */
  authorize: (req: Request) => Promise<OpenAIAuthResult>;
}

/** The response formats this adapter can honour. */
export const SUPPORTED_RESPONSE_FORMATS = ["json"] as const;

type ErrorType = "invalid_request_error" | "authentication_error" | "server_error";

/** An error body in the shape OpenAI clients parse: `{ error: { message, type, param, code } }`. */
export function openAIError(
  status: number,
  message: string,
  type: ErrorType,
  param: string | null = null,
  code: string | null = null,
): Response {
  return Response.json({ error: { message, type, param, code } }, { status });
}

async function authorizeOrError(
  deps: Pick<OpenAITranscriptionDeps, "authorize">,
  req: Request,
): Promise<Response | null> {
  const auth = await deps.authorize(req);
  if (auth.authorized) return null;
  const { status, message } = auth as Extract<OpenAIAuthResult, { authorized: false }>;
  return openAIError(status ?? 401, message, "authentication_error", null, "invalid_api_key");
}

/** The model list, in the OpenAI `GET /v1/models` shape. */
export function listTranscriptionModels() {
  return {
    object: "list" as const,
    data: TRANSCRIPTION_MODELS.map((id) => ({
      id,
      object: "model" as const,
      created: 0,
      owned_by: "qwksearch",
    })),
  };
}

export function createOpenAIModelsHandler(deps: Pick<OpenAITranscriptionDeps, "authorize">) {
  const GET = async (req: Request): Promise<Response> => {
    const denied = await authorizeOrError(deps, req);
    if (denied) return denied;
    return Response.json(listTranscriptionModels());
  };
  return { GET };
}

export function createOpenAITranscriptionHandler(deps: OpenAITranscriptionDeps) {
  const POST = async (req: Request): Promise<Response> => {
    const denied = await authorizeOrError(deps, req);
    if (denied) return denied;

    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return openAIError(
        400,
        "Request body must be multipart/form-data with a `file` field.",
        "invalid_request_error",
        null,
        "invalid_body",
      );
    }

    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return openAIError(400, "`file` is required.", "invalid_request_error", "file", "missing_file");
    }
    if (file.size === 0) {
      return openAIError(400, "`file` is empty.", "invalid_request_error", "file", "empty_file");
    }

    const rawModel = formData.get("model");
    const model = rawModel === null || rawModel === "" ? DEFAULT_TRANSCRIPTION_MODEL : rawModel;
    if (!isTranscriptionModel(model)) {
      return openAIError(
        400,
        `Unsupported model. Use one of: ${TRANSCRIPTION_MODELS.join(", ")}.`,
        "invalid_request_error",
        "model",
        "model_not_found",
      );
    }

    const responseFormat = formData.get("response_format");
    if (responseFormat !== null && responseFormat !== "" && responseFormat !== "json") {
      return openAIError(
        400,
        `Unsupported response_format. Only ${SUPPORTED_RESPONSE_FORMATS.join(", ")} is supported.`,
        "invalid_request_error",
        "response_format",
        "unsupported_response_format",
      );
    }

    try {
      const result = await transcribeAudio(deps, file, model);
      if (!result.ok) {
        return openAIError(503, "Transcription is not available right now.", "server_error", null, "ai_unavailable");
      }
      return Response.json({ text: result.text });
    } catch (error) {
      // The error's name only: never the audio, the transcript, or a message
      // that might quote either.
      console.error("[v1/audio/transcriptions] Workers AI failed:", error instanceof Error ? error.name : typeof error);
      return openAIError(500, "Failed to transcribe audio.", "server_error", null, "transcription_failed");
    }
  };

  return { POST };
}
