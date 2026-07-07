/**
 * @fileoverview Article follow-up question generator. POST accepts an article
 * and returns AI-generated follow-up questions based on the content.
 */
import ModelRegistry from "chat-agent-toolkit/models/registry";
import { ModelWithProvider } from "chat-agent-toolkit/models/types";
import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/auth/session";
import { getDB } from "@/lib/database";
import { user as userSchema } from "@/lib/database/schema";
import { eq } from "drizzle-orm";
import { getEnv } from "@/lib/env";

interface ArticleFollowupsBody {
  article: string;
  chatHistory?: Array<{ role: string; content: string }>;
  maxQuestions?: number;
  provider?: string;
  chatModel?: ModelWithProvider;
}

export const POST = async (req: NextRequest) => {
  try {
    const body: ArticleFollowupsBody = await req.json();
    const {
      article,
      chatHistory = [],
      maxQuestions = 5,
      provider = "groq",
      chatModel,
    } = body;

    if (!article) {
      return NextResponse.json(
        { error: "Article is required" },
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
      // Default to Groq for follow-up generation
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
      ? `\n\nPrevious questions asked:\n${chatHistory
          .filter((msg) => msg.role === "user")
          .map((msg) => `- ${msg.content}`)
          .join("\n")}`
      : "";

    const systemPrompt = `You are a helpful AI that generates insightful follow-up questions about articles.
Generate ${maxQuestions} thought-provoking questions that would help readers understand the article better.
Return ONLY the questions, one per line, without numbering or bullet points.`;

    const userPrompt = `Article content:
${article.slice(0, 15000)}

${historyContext}

Generate ${maxQuestions} follow-up questions that would help readers dive deeper into this article.`;

    // Generate response
    const stream = await llm.stream([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ]);

    let fullResponse = "";
    for await (const chunk of stream) {
      fullResponse += chunk.content;
    }

    // Parse the response into individual questions
    const questions = fullResponse
      .split("\n")
      .map((q) => q.trim())
      .filter((q) => q.length > 0)
      .map((q) => {
        // Remove numbering or bullet points
        return q.replace(/^[\d\-\*\.\)]+\s*/, "").trim();
      })
      .filter((q) => q.length > 10) // Filter out very short lines
      .slice(0, maxQuestions);

    return NextResponse.json({
      extract: questions,
      success: true,
    });
  } catch (error) {
    console.error("Error generating follow-up questions:", error);
    return NextResponse.json(
      {
        error: "An error occurred while generating follow-up questions",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
};
