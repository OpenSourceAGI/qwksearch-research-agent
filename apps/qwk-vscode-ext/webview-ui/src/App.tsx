import { useEffect, useRef, useState } from "react";
import SignInView from "./SignInView";
import TopBar from "./TopBar";
import MessageList from "./MessageList";
import Composer from "./Composer";
import { bridge, useExtensionMessages } from "./useExtensionMessages";
import { apiRequestJson } from "./apiRequestJson";
import { sendChatMessage } from "./sendChatMessage";
import { selectDefaultChatModel } from "./selectChatModel";
import type { ChatMessage, ChatModelSelection, Provider } from "./types";

type AuthState = "loading" | "signedOut" | "signedIn";

export default function App() {
  const [authState, setAuthState] = useState<AuthState>("loading");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [focusMode, setFocusMode] = useState("webSearch");
  const [category, setCategory] = useState("general");
  const [chatModel, setChatModel] = useState<ChatModelSelection>();
  const [prefill, setPrefill] = useState<string>();
  const [configError, setConfigError] = useState<string>();

  const chatIdRef = useRef(crypto.randomUUID());
  const historyRef = useRef<[string, string][]>([]);

  useEffect(() => {
    bridge.post({ type: "ready" });
  }, []);

  useExtensionMessages((message) => {
    if (message.type === "authState") {
      setAuthState(message.authenticated ? "signedIn" : "signedOut");
    } else if (message.type === "config") {
      setFocusMode(message.focusMode);
    } else if (message.type === "prefill") {
      setPrefill(`${message.text}\n\n`);
    }
  });

  useEffect(() => {
    if (authState !== "signedIn" || chatModel) return;
    apiRequestJson<{ providers: Provider[] }>("GET", "/api/agent/providers")
      .then((res) => {
        const selection = selectDefaultChatModel(res?.providers ?? []);
        if (selection) setChatModel(selection);
        else setConfigError("No AI models are configured for your QwkSearch account yet.");
      })
      .catch((err) => setConfigError(err.message ?? String(err)));
  }, [authState, chatModel]);

  const handleSend = (content: string) => {
    if (!chatModel || loading) return;
    setLoading(true);
    setPrefill(undefined);

    let assistantContent = "";
    setMessages((prev) => [...prev, { role: "user", messageId: `u-${Date.now()}`, content }]);

    sendChatMessage(
      {
        chatId: chatIdRef.current,
        content,
        history: historyRef.current,
        focusMode,
        category,
        chatModel,
      },
      {
        onSearching: (messageId, query, status) => {
          setMessages((prev) => {
            const idx = prev.findIndex((m) => m.role === "searching" && m.messageId === messageId);
            if (idx === -1) {
              return [...prev, { role: "searching", messageId, queries: [{ query, status }] }];
            }
            return prev.map((m, i) => {
              if (i !== idx || m.role !== "searching") return m;
              const qIdx = m.queries.findIndex((q) => q.query === query);
              const queries =
                qIdx === -1
                  ? [...m.queries, { query, status }]
                  : m.queries.map((q, qi) => (qi === qIdx ? { ...q, status } : q));
              return { ...m, queries };
            });
          });
        },
        onSources: (messageId, sources) => {
          setMessages((prev) => [...prev, { role: "source", messageId, sources }]);
        },
        onAssistantChunk: (messageId, delta, isFirst) => {
          assistantContent += delta;
          setMessages((prev) => {
            if (isFirst) return [...prev, { role: "assistant", messageId, content: delta }];
            return prev.map((m) =>
              m.role === "assistant" && m.messageId === messageId
                ? { ...m, content: m.content + delta }
                : m,
            );
          });
        },
        onDone: () => {
          historyRef.current = [...historyRef.current, ["human", content], ["assistant", assistantContent]];
          setLoading(false);
        },
        onError: (message) => {
          setMessages((prev) => [...prev, { role: "error", messageId: `e-${Date.now()}`, content: message }]);
          setLoading(false);
        },
      },
    );
  };

  if (authState === "loading") {
    return <div className="empty-state">Connecting to QwkSearch…</div>;
  }

  if (authState === "signedOut") {
    return <SignInView />;
  }

  return (
    <div className="app">
      <TopBar
        focusMode={focusMode}
        onFocusModeChange={setFocusMode}
        category={category}
        onCategoryChange={setCategory}
        onNewChat={() => {
          chatIdRef.current = crypto.randomUUID();
          historyRef.current = [];
          setMessages([]);
        }}
        onSignOut={() => bridge.post({ type: "logout" })}
      />
      <MessageList messages={messages} />
      {configError && <div className="message error">{configError}</div>}
      <Composer disabled={loading || !chatModel} prefill={prefill} onSend={handleSend} />
    </div>
  );
}
