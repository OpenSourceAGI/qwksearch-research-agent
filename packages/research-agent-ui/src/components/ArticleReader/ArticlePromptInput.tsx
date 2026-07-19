/**
 * Single-line text input for entering AI questions about the current article; submits on Enter.
 */
import React from 'react';

interface ArticlePromptInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
}

const ArticlePromptInput: React.FC<ArticlePromptInputProps> = ({
  value,
  onChange,
  onSubmit,
}) => {
  return (
    <div className="relative">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
        type="text"
        placeholder="Ask AI any question..."
        className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      />
    </div>
  );
};

export default ArticlePromptInput;
