declare module "@huggingface/transformers" {
  export function pipeline(task: string, model: string, options?: any): Promise<any>;
}

declare module "*.csv?raw" {
  const content: string;
  export default content;
}
