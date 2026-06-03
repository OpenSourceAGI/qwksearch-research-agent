/**
 * Maps the custom `<think>` markdown tag in AI responses to the collapsible MessageReasoningPanel component.
 */
'use client';

import React from 'react';
import ThinkBox from '../MessageReasoningPanel';

/**
 * Processor for the <think> tag in AI responses.
 * Renders the thinking process inside a ThinkBox component.
 * 
 * @param children - The thinking content
 * @param thinkingEnded - Whether the thinking phase has completed
 */
const ThinkTagProcessor = ({
    children,
    thinkingEnded,
}: {
    children: React.ReactNode;
    thinkingEnded: boolean;
}) => {
    return (
        <ThinkBox content={children as string} thinkingEnded={thinkingEnded} />
    );
};

export default ThinkTagProcessor;
