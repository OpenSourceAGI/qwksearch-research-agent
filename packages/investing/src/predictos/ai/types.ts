// Types for BlockRun API requests and responses (x402 micropayments)
export interface BlockRunRequestMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface BlockRunRequestPayload {
  model: string;
  messages: BlockRunRequestMessage[];
  temperature?: number | null;
  top_p?: number | null;
  max_tokens?: number | null;
  response_format?: {
    type: string;
  };
  search?: boolean; // Enable xAI Live Search for Grok models
}

export interface BlockRunPaymentRequirements {
  x402Version?: number;
  scheme: string;
  network: string;
  asset: string;
  amount?: string;
  maxAmountRequired?: string; // Legacy field
  payTo: string;
  maxTimeoutSeconds?: number;
  extra?: {
    name?: string;
    version?: string;
    [key: string]: unknown;
  };
}

export interface BlockRunUsage {
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
}

export interface BlockRunOutputText {
  type: "output_text";
  text: string;
}

export interface BlockRunMessage {
  content: BlockRunOutputText[];
  id: string;
  role: "assistant";
  type: "message";
  status: "completed" | "failed" | "pending";
}

export interface BlockRunResponseResult {
  created_at: number;
  id: string;
  model: string;
  object: "response";
  output: BlockRunMessage[];
  temperature: number | null;
  top_p: number | null;
  usage: BlockRunUsage;
  status: "completed" | "failed" | "pending";
  // BlockRun-specific metadata
  blockrun?: {
    paymentCost?: string;
    citations?: string[];
  };
}

// Types for Grok API requests and responses
export interface GrokRequestInput {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface GrokRequestTool {
  type: "web_search" | "x_search"
}

export interface GrokRequestPayload {
  model: string;
  input: GrokRequestInput[];
  tools?: GrokRequestTool[];
  tool_choice?: "auto" | "none" | "required";
  temperature?: number | null;
  top_p?: number | null;
  max_output_tokens?: number | null;
  parallel_tool_calls?: boolean;
  store?: boolean;
  previous_response_id?: string | null;
  response_format?: {
    type: string;
  };
}

// Types for OpenAI API requests and responses
export interface OpenAIRequestInput {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface OpenAIRequestPayload {
  model: string;
  input: OpenAIRequestInput[];
  temperature?: number | null;
  top_p?: number | null;
  max_output_tokens?: number | null;
  store?: boolean;
  text?: {
    format: {
      type: string;
    };
  };
}

export interface OpenAIUsage {
  input_tokens: number;
  input_tokens_details?: {
    cached_tokens?: number;
  };
  output_tokens: number;
  output_tokens_details?: {
    reasoning_tokens?: number;
  };
  total_tokens: number;
}

export interface OpenAIOutputText {
  type: "output_text";
  text: string;
  annotations?: unknown[];
}

export interface OpenAIMessage {
  content: OpenAIOutputText[];
  id: string;
  role: "assistant";
  type: "message";
  status: "completed" | "failed" | "pending";
}

export type OpenAIOutputItem = OpenAIMessage;

export interface OpenAIResponseResult {
  created_at: number;
  id: string;
  model: string;
  object: "response";
  output: OpenAIOutputItem[];
  temperature: number | null;
  top_p: number | null;
  usage: OpenAIUsage;
  status: "completed" | "failed" | "pending";
}

export interface GrokUsage {
  input_tokens: number;
  input_tokens_details?: {
    cached_tokens?: number;
  };
  output_tokens: number;
  output_tokens_details?: {
    reasoning_tokens?: number;
  };
  total_tokens: number;
  num_sources_used?: number;
  num_server_side_tools_used?: number;
  server_side_tool_usage_details?: {
    web_search_calls?: number;
    x_search_calls?: number;
    code_interpreter_calls?: number;
    file_search_calls?: number;
    mcp_calls?: number;
    document_search_calls?: number;
  };
}

export interface GrokReasoning {
  effort?: string | null;
  summary?: string | null;
}

export interface GrokTextFormat {
  format: {
    type: "text";
  };
}

export interface GrokAnnotation {
  type: "url_citation";
  url: string;
}

export interface GrokOutputText {
  type: "output_text";
  text: string;
  logprobs?: unknown[];
  annotations?: GrokAnnotation[];
}

export interface GrokCustomToolCall {
  call_id: string;
  input: string;
  name: string;
  type: "custom_tool_call";
  id: string;
  status: "completed" | "failed" | "pending";
}

export interface GrokMessage {
  content: GrokOutputText[];
  id: string;
  role: "assistant";
  type: "message";
  status: "completed" | "failed" | "pending";
}

export type GrokOutputItem = GrokCustomToolCall | GrokMessage;

export interface GrokResponseResult {
  created_at: number;
  id: string;
  max_output_tokens: number | null;
  model: string;
  object: "response";
  output: GrokOutputItem[];
  parallel_tool_calls: boolean;
  previous_response_id: string | null;
  reasoning: GrokReasoning;
  temperature: number | null;
  text: GrokTextFormat;
  tool_choice: "auto" | "none" | "required";
  tools: GrokRequestTool[];
  top_p: number | null;
  usage: GrokUsage;
  user: string | null;
  incomplete_details: unknown | null;
  status: "completed" | "failed" | "pending";
  store: boolean;
  metadata: Record<string, unknown>;
}

