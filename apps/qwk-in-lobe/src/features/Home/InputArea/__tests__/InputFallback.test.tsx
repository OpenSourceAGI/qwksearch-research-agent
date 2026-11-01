/**
 * @vitest-environment happy-dom
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import InputFallback from '../InputFallback';

vi.mock('../ModeSelect', () => ({ default: () => null }));

const renderFallback = (props: { loading?: boolean; value?: string } = {}) => {
  const send = vi.fn();
  render(
    <InputFallback
      loading={props.loading ?? false}
      mode={'chat'}
      placeholder={'Ask anything'}
      send={send}
      value={props.value ?? 'hello there'}
      onCompositionEnd={vi.fn()}
      onCompositionStart={vi.fn()}
      onModeChange={vi.fn()}
      onValueChange={vi.fn()}
    />,
  );
  return { send, textarea: screen.getByRole('textbox') };
};

const sentText = (send: ReturnType<typeof vi.fn>) => send.mock.calls[0][0].getMarkdownContent();

// The rich editor loads after first paint, so the plain textarea shown until
// then must be able to send by itself.
describe('Home InputFallback', () => {
  it('sends the typed text on Enter', () => {
    const { send, textarea } = renderFallback();

    fireEvent.keyDown(textarea, { key: 'Enter' });

    expect(send).toHaveBeenCalledTimes(1);
    expect(sentText(send)).toBe('hello there');
  });

  it('keeps Shift+Enter as a newline', () => {
    const { send, textarea } = renderFallback();

    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });

    expect(send).not.toHaveBeenCalled();
  });

  it('sends from the send button', () => {
    const { send } = renderFallback();

    fireEvent.click(screen.getByTestId('home-input-fallback-send'));

    expect(send).toHaveBeenCalledTimes(1);
    expect(sentText(send)).toBe('hello there');
  });

  it('does not send twice while a send is in flight', () => {
    const { send, textarea } = renderFallback({ loading: true });

    fireEvent.keyDown(textarea, { key: 'Enter' });

    expect(send).not.toHaveBeenCalled();
  });
});
