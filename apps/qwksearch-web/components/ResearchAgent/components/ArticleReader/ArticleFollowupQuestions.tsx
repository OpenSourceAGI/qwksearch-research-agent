/**
 * Renders a clickable list of AI-generated follow-up question suggestions for the open article.
 */
import React from 'react';
import { DEFAULT_SUMMARIZE_PROMPT } from '@/lib/config/site';

interface ArticleFollowupQuestionsProps {
  questions: string[];
  isLoading: boolean;
  error: string;
  onQuestionClick: (question: string) => void;
}

const ArticleFollowupQuestions: React.FC<ArticleFollowupQuestionsProps> = ({
  questions,
  isLoading,
  error,
  onQuestionClick,
}) => {
  return (
    <>
      {questions.length > 0 && (
        <div className="space-y-2">
          <div
            onClick={() => onQuestionClick(DEFAULT_SUMMARIZE_PROMPT)}
            className="cursor-pointer rounded-md p-2 text-sm font-semibold hover:bg-accent border border-border transition-colors"
          >
            {DEFAULT_SUMMARIZE_PROMPT}
          </div>
          {questions.map((question, i) => (
            <div
              key={i}
              onClick={() => onQuestionClick(question)}
              className="cursor-pointer rounded-md p-2 text-sm font-semibold hover:bg-accent border border-border transition-colors"
              dangerouslySetInnerHTML={{ __html: question }}
            />
          ))}
        </div>
      )}

      {isLoading && (
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      )}

      {error && (
        <div className="bg-red-500 text-white p-2 rounded-md text-sm">
          {error}
        </div>
      )}
    </>
  );
};

export default ArticleFollowupQuestions;
