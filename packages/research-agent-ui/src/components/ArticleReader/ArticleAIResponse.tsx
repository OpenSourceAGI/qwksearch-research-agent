/**
 * Displays the AI-generated response to a user's prompt about the current article, with loading spinner and error state.
 */
import React from 'react';

interface ArticleAIResponseProps {
  response: string;
  isLoading: boolean;
  error: string;
}

const ArticleAIResponse: React.FC<ArticleAIResponseProps> = ({
  response,
  isLoading,
  error,
}) => {
  const highlightCodeSyntax = (element: HTMLDivElement | null) => {
    if (!element) return;
    // This would integrate with highlight.js if needed
  };

  return (
    <>
      {isLoading && (
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      )}

      {response && (
        <div
          ref={highlightCodeSyntax}
          className="bg-muted rounded-lg shadow-md p-4"
          dangerouslySetInnerHTML={{ __html: response }}
        />
      )}

      {error && (
        <div className="bg-red-500 text-white p-2 rounded-md text-sm">
          {error}
        </div>
      )}
    </>
  );
};

export default ArticleAIResponse;
