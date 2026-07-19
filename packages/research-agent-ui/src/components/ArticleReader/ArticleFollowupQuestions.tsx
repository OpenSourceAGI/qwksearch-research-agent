/**
 * Renders a clickable list of AI-generated follow-up question suggestions for the open article.
 */
import React from 'react';
import { researchAgentUIConfig } from '../../config';

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
  // Split questions that contain multiple sentences ending with ?
  const splitQuestions = React.useMemo(() => {
    const result: string[] = [];
    questions.forEach(q => {
      // Check if the question contains multiple sentences by looking for ? followed by non-whitespace
      if (q.includes('?') && q.split('?').length > 2) {
        // Split by ? and filter out empty strings
        const parts = q.split('?').map(part => part.trim()).filter(Boolean);
        parts.forEach(part => {
          // Re-add the ? mark if it doesn't already have one
          result.push(part.endsWith('?') ? part : `${part}?`);
        });
      } else {
        result.push(q);
      }
    });
    return result;
  }, [questions]);

  return (
    <>
      {splitQuestions.length > 0 && (
        <div className="space-y-3 bg-accent/30 rounded-lg p-4 border border-primary/20">
          <h3 className="text-sm font-bold text-primary mb-2">
            💡 Suggested Follow-up Questions
          </h3>
          <div className="space-y-2">
            <div
              onClick={() => onQuestionClick(researchAgentUIConfig.defaultSummarizePrompt)}
              className="cursor-pointer rounded-md p-3 text-sm font-semibold hover:bg-primary/10 bg-background border border-primary/30 transition-all hover:border-primary shadow-sm hover:shadow-md"
            >
              {researchAgentUIConfig.defaultSummarizePrompt}
            </div>
            {splitQuestions.map((question, i) => (
              <div
                key={i}
                onClick={() => onQuestionClick(question)}
                className="cursor-pointer rounded-md p-3 text-sm font-semibold hover:bg-primary/10 bg-background border border-border transition-all hover:border-primary shadow-sm hover:shadow-md"
                dangerouslySetInnerHTML={{ __html: question }}
              />
            ))}
          </div>
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
