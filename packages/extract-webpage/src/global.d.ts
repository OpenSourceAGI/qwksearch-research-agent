declare module "@huggingface/transformers" {
  export function pipeline(task: string, model: string, options?: any): Promise<any>;
}
