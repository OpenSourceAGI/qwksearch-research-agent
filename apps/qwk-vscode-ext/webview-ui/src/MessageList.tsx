import Markdown from "markdown-to-jsx";
import type { ChatMessage } from "./types";
import { bridge } from "./useExtensionMessages";

/** Webviews don't navigate to external URLs on click; route them through the extension host. */
function ExternalLink({ href, children, ...rest }: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a
      {...rest}
      href={href}
      onClick={(e) => {
        e.preventDefault();
        if (href) bridge.post({ type: "openExternal", url: href });
      }}
    >
      {children}
    </a>
  );
}

/**
 * Marks what kind of agent step a progress pill is. The chat engine reports
 * page reads as "extract", calculator calls as "Calculator", MCP and other
 * tool calls as "tool"; anything else is a search.
 */
function stepIcon(category?: string): string {
  if (category === "extract") return "📄 ";
  if (category === "Calculator") return "🧮 ";
  if (category === "tool") return "🧩 ";
  return "";
}

export default function MessageList({ messages }: { messages: ChatMessage[] }) {
  if (messages.length === 0) {
    return (
      <div className="messages">
        <div className="empty-state">
          Ask a research question. QwkSearch will search the web and cite its sources.
        </div>
      </div>
    );
  }

  return (
    <div className="messages">
      {messages.map((message) => (
        <MessageItem key={`${message.role}-${message.messageId}`} message={message} />
      ))}
    </div>
  );
}

function MessageItem({ message }: { message: ChatMessage }) {
  switch (message.role) {
    case "user":
      return <div className="message user">{message.content}</div>;
    case "assistant":
      return (
        <div className="message assistant">
          <Markdown options={{ overrides: { a: { component: ExternalLink } } }}>
            {message.content || "…"}
          </Markdown>
        </div>
      );
    case "error":
      return <div className="message error">{message.content}</div>;
    case "searching":
      return (
        <div className="searching">
          {message.queries.map((q, i) => (
            <span key={i} className={`pill${q.status === "done" ? " done" : ""}`} title={q.category}>
              {q.status === "done" ? "✓" : "…"} {stepIcon(q.category)}
              {q.query}
            </span>
          ))}
        </div>
      );
    case "source": {
      // Numbered by position in the full list, uploads included, so the
      // numbers match the answer's [n] citations.
      const withUrl = message.sources
        .map((s, i) => ({ s, n: i + 1 }))
        .filter(({ s }) => s.metadata?.url && s.metadata.url !== "File");
      if (withUrl.length === 0) return null;
      return (
        <div className="sources">
          {withUrl.map(({ s, n }) => (
            <ExternalLink key={n} href={s.metadata!.url} title={s.metadata?.title}>
              {n}. {s.metadata?.title || s.metadata!.url}
            </ExternalLink>
          ))}
        </div>
      );
    }
    default:
      return null;
  }
}
