/**
 * @fileoverview Minimal header bar for the article extract panel with a close button.
 */
import React from 'react';
import { X } from 'lucide-react';

interface ArticlePanelHeaderProps {
  onClose: () => void;
}

const ArticlePanelHeader: React.FC<ArticlePanelHeaderProps> = ({ onClose }) => {
  return (
    <div className="flex items-center justify-between bg-secondary px-4 py-3 border-b border-border">
      <button
        onClick={onClose}
        className="rounded-md p-1 hover:bg-accent transition-colors"
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  );
};

export default ArticlePanelHeader;
