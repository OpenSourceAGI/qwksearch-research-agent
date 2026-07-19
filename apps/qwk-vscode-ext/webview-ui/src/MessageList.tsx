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
            <span key={i} className={`pill${q.status === "done" ? " done" : ""}`}>
              {q.status === "done" ? "✓" : "…"} {q.query}
            </span>
          ))}
        </div>
      );
    case "source": {
      const withUrl = message.sources.filter((s) => s.metadata?.url && s.metadata.url !== "File");
      if (withUrl.length === 0) return null;
      return (
        <div className="sources">
          {withUrl.map((s, i) => (
            <ExternalLink key={i} href={s.metadata!.url} title={s.metadata?.title}>
              {i + 1}. {s.metadata?.title || s.metadata!.url}
            </ExternalLink>
          ))}
        </div>
      );
    }
    default:
      return null;
  }
}
