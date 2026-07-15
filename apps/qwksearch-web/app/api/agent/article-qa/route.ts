/**
 * @fileoverview Article Q&A endpoint. POST accepts an article and question,
 * and returns an AI-generated answer based on the article content.
 */
import ModelRegistry from "chat-agent-toolkit/models/registry";
import { ModelWithProvider } from "chat-agent-toolkit/models/types";
import { createGroq } from "@ai-sdk/groq";
import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/auth/session";
import { getDB } from "@/lib/database";
import { user as userSchema } from "@/lib/database/schema";
import { eq } from "drizzle-orm";
import { getEnv } from "@/lib/env";

interface ArticleQABody {
  article: string;
  question: string;
  chatHistory?: Array<{ role: string; content: string }>;
  provider?: string;
  chatModel?: ModelWithProvider;
}

export const POST = async (req: NextRequest) => {
  try {
    const body: ArticleQABody = await req.json();
    const { article, question, chatHistory = [], provider = "groq", chatModel } = body;

    if (!article || !question) {
      return NextResponse.json(
        { error: "Article and question are required" },
        { status: 400 }
      );
    }

    // Get user if authenticated
    const db = getDB();
    const userId = await getUserId();
    let user = null;
    let apiKey = null;

    if (userId) {
      const result = await db.query.user.findFirst({
        where: eq(userSchema.id, userId),
      });
      user = result;
    }

    // Get user's own API key
    if (user) {
      apiKey = user.settings?.providerApiKeys?.find(
        (key: any) => key.provider == provider,
      )?.key;
    }

    // Provide default API keys
    if (!apiKey) {
      apiKey = provider == "groq" ? getEnv("GROQ_API_KEY") : null;
    }

    if (!apiKey) {
      return NextResponse.json(
        { error: "API key is required" },
        { status: 500 }
      );
    }

    // Load the model
    const registry = new ModelRegistry();
    let llm;

    if (chatModel) {
      llm = await registry.loadChatModel(chatModel.providerId, chatModel.key);
    } else {
      // Default to Groq llama-3.3-70b-versatile for article Q&A
      llm = await registry.loadChatModel("groq", "llama-3.3-70b-versatile");
    }

    if (!llm) {
      return NextResponse.json(
        { error: "Failed to load language model" },
        { status: 500 }
      );
    }

    // Build the prompt
    const historyContext = chatHistory.length > 0
      ? `\n\nPrevious conversation:\n${chatHistory
          .map((msg) => `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`)
          .join("\n")}`
      : "";

    const systemPrompt = `You are a helpful AI assistant that answers questions about articles.
Provide clear, concise, and accurate answers based on the article content provided.
If the answer is not in the article, say so.`;

    const userPrompt = `Article content:
${article.slice(0, 15000)}

${historyContext}

User question: ${question}

Please provide a helpful answer based on the article content above.`;

    // Generate response
    const stream = await llm.stream([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ]);

    let fullResponse = "";
    for await (const chunk of stream) {
      fullResponse += chunk.content;
    }

    return NextResponse.json({
      content: fullResponse,
      success: true,
    });
  } catch (error) {
    console.error("Error in article Q&A:", error);
    return NextResponse.json(
      {
        error: "An error occurred while generating the answer",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
};
