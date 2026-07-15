const CATEGORIES = [
  { code: "general", name: "Web" },
  { code: "news", name: "News" },
  { code: "science", name: "Academic" },
  { code: "it", name: "Tech" },
];

interface TopBarProps {
  focusMode: string;
  onFocusModeChange: (mode: string) => void;
  category: string;
  onCategoryChange: (category: string) => void;
  onNewChat: () => void;
  onSignOut: () => void;
}

export default function TopBar({
  focusMode,
  onFocusModeChange,
  category,
  onCategoryChange,
  onNewChat,
  onSignOut,
}: TopBarProps) {
  return (
    <div className="top-bar">
      <select value={focusMode} onChange={(e) => onFocusModeChange(e.target.value)} title="Research focus">
        <option value="webSearch">Web Search</option>
        <option value="writingAssistant">Writing Assistant</option>
      </select>
      {focusMode === "webSearch" && (
        <select value={category} onChange={(e) => onCategoryChange(e.target.value)} title="Category">
          {CATEGORIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </select>
      )}
      <span className="spacer" />
      <button className="icon-button" onClick={onNewChat} title="New chat">
        New Chat
      </button>
      <button className="icon-button" onClick={onSignOut} title="Sign out">
        Sign Out
      </button>
    </div>
  );
}
