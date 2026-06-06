'use client';

/**
 * Composio MCP chat interface
 * Shows real-time tool calling with Composio integrations
 */

import { useChat } from '@ai-sdk/react';
import { useState, useEffect } from 'react';

const AVAILABLE_TOOLKITS = [
  'GMAIL',
  'SLACK',
  'NOTION',
  'GITHUB',
  'CALENDAR',
  'DRIVE',
  'JIRA',
  'LINEAR',
];

export default function ComposioChat() {
  const [userId, setUserId] = useState('demo-user');
  const [selectedToolkits, setSelectedToolkits] = useState([
    'GMAIL',
    'SLACK',
    'NOTION',
  ]);
  const [authenticatedToolkits, setAuthenticatedToolkits] = useState<string[]>(
    []
  );

  const { messages, input, handleInputChange, handleSubmit, status, error } =
    useChat({
      api: '/api/chat',
      body: {
        userId,
        toolkits: selectedToolkits,
      },
    });

  // Fetch authenticated toolkits on mount
  useEffect(() => {
    fetch(`/api/chat?userId=${userId}`)
      .then((res) => res.json())
      .then((data) => setAuthenticatedToolkits(data.authenticatedToolkits))
      .catch(console.error);
  }, [userId]);

  const toggleToolkit = (toolkit: string) => {
    setSelectedToolkits((prev) =>
      prev.includes(toolkit)
        ? prev.filter((t) => t !== toolkit)
        : [...prev, toolkit]
    );
  };

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className="w-80 border-r p-4 overflow-y-auto bg-gray-50">
        <h2 className="text-xl font-bold mb-4">Composio MCP Chat</h2>

        {/* User ID */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-1">User ID</label>
          <input
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="w-full border rounded px-3 py-2"
            placeholder="your-user-id"
          />
        </div>

        {/* Toolkit Selection */}
        <div className="mb-6">
          <h3 className="text-sm font-medium mb-2">
            Select Toolkits ({selectedToolkits.length})
          </h3>
          <div className="space-y-2">
            {AVAILABLE_TOOLKITS.map((toolkit) => {
              const isAuthenticated =
                authenticatedToolkits.includes(toolkit);
              const isSelected = selectedToolkits.includes(toolkit);

              return (
                <label
                  key={toolkit}
                  className={`flex items-center gap-2 p-2 rounded cursor-pointer ${
                    isSelected ? 'bg-blue-50 border-blue-300' : 'bg-white'
                  } border`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleToolkit(toolkit)}
                    className="w-4 h-4"
                  />
                  <span className="flex-1">{toolkit}</span>
                  {isAuthenticated ? (
                    <span className="text-green-600 text-xs">✓ Auth</span>
                  ) : (
                    <span className="text-gray-400 text-xs">○</span>
                  )}
                </label>
              );
            })}
          </div>
        </div>

        {/* Instructions */}
        <div className="text-xs text-gray-600 bg-white p-3 rounded border">
          <p className="font-medium mb-1">Instructions:</p>
          <ol className="list-decimal ml-4 space-y-1">
            <li>Set your user ID</li>
            <li>Select toolkits to enable</li>
            <li>
              Authenticate toolkits at:{' '}
              <a
                href="https://app.composio.dev/apps"
                target="_blank"
                rel="noopener"
                className="text-blue-600"
              >
                Composio Dashboard
              </a>
            </li>
            <li>Start chatting!</li>
          </ol>
        </div>

        {/* Example Prompts */}
        <div className="mt-4 text-xs">
          <p className="font-medium mb-1">Example Prompts:</p>
          <ul className="space-y-1 text-gray-600">
            <li>• "Check my unread emails"</li>
            <li>• "Create a Notion page about today's tasks"</li>
            <li>• "Post to #general on Slack"</li>
            <li>• "List my open GitHub issues"</li>
          </ul>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-gray-500 mt-20">
              <h3 className="text-lg font-medium mb-2">
                Start a conversation
              </h3>
              <p className="text-sm">
                I have access to {selectedToolkits.length} toolkits via
                Composio MCP
              </p>
            </div>
          )}

          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-2xl rounded-lg p-4 ${
                  m.role === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                {/* Role */}
                <div className="font-semibold mb-1 text-sm">
                  {m.role === 'user' ? 'You' : 'Assistant'}
                </div>

                {/* Content */}
                <div className="whitespace-pre-wrap">
                  {m.parts?.map((p, i) =>
                    p.type === 'text' ? (
                      <span key={i}>{p.text}</span>
                    ) : p.type === 'tool-call' ? (
                      <div
                        key={i}
                        className="mt-2 text-xs bg-black/10 rounded p-2"
                      >
                        🔧 Tool: {p.toolName}
                      </div>
                    ) : null
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Status indicators */}
          {status === 'streaming' && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-lg p-4 text-gray-600 text-sm">
                <span className="animate-pulse">Thinking...</span>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
              <strong>Error:</strong> {error.message}
              {error.message.includes('authentication') && (
                <div className="mt-2 text-sm">
                  Please authenticate your toolkits at{' '}
                  <a
                    href="https://app.composio.dev/apps"
                    target="_blank"
                    rel="noopener"
                    className="underline"
                  >
                    Composio Dashboard
                  </a>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Input Form */}
        <form
          onSubmit={handleSubmit}
          className="border-t p-4 flex gap-2 bg-white"
        >
          <input
            value={input}
            onChange={handleInputChange}
            placeholder="Ask me to use your integrated tools..."
            className="flex-1 border rounded-lg px-4 py-3"
            disabled={status !== 'ready'}
          />
          <button
            type="submit"
            disabled={status !== 'ready' || !input.trim()}
            className="bg-blue-500 text-white px-6 py-3 rounded-lg disabled:bg-gray-300 font-medium hover:bg-blue-600 transition-colors"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
