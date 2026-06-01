/**
 * @fileoverview Plugin for automatically embedding content (e.g., YouTube) from URLs.
 * Integrates with LexicalAutoEmbedPlugin and provides a typeahead menu for embed options.
 */


import type { LexicalEditor } from 'lexical';
import type { JSX } from 'react';

import {
  AutoEmbedOption,
  EmbedConfig,
  EmbedMatchResult,
  LexicalAutoEmbedPlugin,
  URL_MATCHER,
} from '@lexical/react/LexicalAutoEmbedPlugin';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useMemo, useState, useEffect } from 'react';
import * as React from 'react';
import * as ReactDOM from 'react-dom';

import useModal from '../../hooks/useModal';
import Button from '../../ui/Button';
import Icon from '../../ui/Icon';
import { DialogActions } from '../../ui/Dialog';
import { INSERT_YOUTUBE_COMMAND } from '../YouTubePlugin';
import { INSERT_EMOJI_COMMAND } from '../EmojiSelectorPlugin';

interface PlaygroundEmbedConfig extends EmbedConfig {
  // Human readable name of the embedded content e.g. Tweet or Google Map.
  contentName: string;

  // Icon for display.
  icon?: JSX.Element;

  // An example of a matching url https://twitter.com/jack/status/20
  exampleUrl: string;

  // For extra searching.
  keywords: Array<string>;
}

export const YoutubeEmbedConfig: PlaygroundEmbedConfig = {
  contentName: 'Youtube',

  exampleUrl: 'https://www.youtube.com/watch?v=jNQXAC9IVRw',

  // Icon for display.
  icon: <Icon name="youtube" />,

  insertNode: (editor: LexicalEditor, result: EmbedMatchResult) => {
    editor.dispatchCommand(INSERT_YOUTUBE_COMMAND, result.id);
  },

  keywords: ['youtube', 'video'],

  // Determine if a given URL is a match and return url data.
  parseUrl: async (url: string) => {
    const match =
      /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/.exec(url);

    const id = match ? (match?.[2].length === 11 ? match[2] : null) : null;

    if (id != null) {
      return {
        id,
        url,
      };
    }

    return null;
  },

  type: 'youtube-video',
};

export const EmojiSelectorEmbedConfig: PlaygroundEmbedConfig = {
  contentName: 'Emoji',

  exampleUrl: '',

  // Icon for display.
  icon: <Icon name="emoji" />,

  insertNode: (editor: LexicalEditor, result: EmbedMatchResult) => {
    editor.dispatchCommand(INSERT_EMOJI_COMMAND, result.id);
  },

  keywords: ['emoji', 'emoticon', 'smiley'],

  // For emoji selector, we don't parse URLs - just return the emoji directly
  parseUrl: async (emoji: string) => {
    if (emoji && emoji.length > 0) {
      return {
        id: emoji,
        url: emoji,
      };
    }
    return null;
  },

  type: 'emoji-selector',
};

export const EmbedConfigs = [
  YoutubeEmbedConfig,
  EmojiSelectorEmbedConfig,
];

function AutoEmbedMenuItem({
  index,
  isSelected,
  onClick,
  onMouseEnter,
  option,
}: {
  index: number;
  isSelected: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
  option: AutoEmbedOption;
}) {
  let className = 'item';
  if (isSelected) {
    className += ' selected';
  }
  return (
    <li
      key={option.key}
      tabIndex={-1}
      className={className}
      ref={option.setRefElement}
      role="option"
      aria-selected={isSelected}
      id={'typeahead-item-' + index}
      onMouseEnter={onMouseEnter}
      onClick={onClick}>
      <span className="text">{option.title}</span>
    </li>
  );
}

function AutoEmbedMenu({
  options,
  selectedItemIndex,
  onOptionClick,
  onOptionMouseEnter,
}: {
  selectedItemIndex: number | null;
  onOptionClick: (option: AutoEmbedOption, index: number) => void;
  onOptionMouseEnter: (index: number) => void;
  options: Array<AutoEmbedOption>;
}) {
  return (
    <div className="typeahead-popover">
      <ul>
        {options.map((option: AutoEmbedOption, i: number) => (
          <AutoEmbedMenuItem
            index={i}
            isSelected={selectedItemIndex === i}
            onClick={() => onOptionClick(option, i)}
            onMouseEnter={() => onOptionMouseEnter(i)}
            key={option.key}
            option={option}
          />
        ))}
      </ul>
    </div>
  );
}

const debounce = (callback: (text: string) => void, delay: number) => {
  let timeoutId: number;
  return (text: string) => {
    window.clearTimeout(timeoutId);
    timeoutId = window.setTimeout(() => {
      callback(text);
    }, delay);
  };
};

/**
 * Dialog for emoji picker.
 */
export function EmojiPickerDialog({
  embedConfig,
  onClose,
}: {
  embedConfig: PlaygroundEmbedConfig;
  onClose: () => void;
}): JSX.Element {
  const [editor] = useLexicalComposerContext();

  // Dynamically import EmojiPicker from CDN to avoid SSR issues and skip the npm package
  const [EmojiPicker, setEmojiPicker] = useState<any>(null);

  useEffect(() => {
    // @ts-ignore
    import(/* @vite-ignore */ 'https://esm.sh/emoji-picker-react').then((mod) => {
      setEmojiPicker(() => mod.default);
    });
  }, []);

  const onEmojiClick = (emojiData: any) => {
    editor.dispatchCommand(INSERT_EMOJI_COMMAND, emojiData.emoji);
    onClose();
  };

  return (
    <div style={{ width: 'auto' }}>
      {EmojiPicker ? (
        <EmojiPicker onEmojiClick={onEmojiClick} width="100%" height="400px" />
      ) : (
        <div style={{ padding: '20px', textAlign: 'center' }}>Loading emoji picker...</div>
      )}
    </div>
  );
}

/**
 * Dialog for confirming and inserting an auto-embed.
 */
export function AutoEmbedDialog({
  embedConfig,
  onClose,
}: {
  embedConfig: PlaygroundEmbedConfig;
  onClose: () => void;
}): JSX.Element {
  const [text, setText] = useState('');
  const [editor] = useLexicalComposerContext();
  const [embedResult, setEmbedResult] = useState<EmbedMatchResult | null>(null);

  const validateText = useMemo(
    () =>
      debounce((inputText: string) => {
        const urlMatch = URL_MATCHER.exec(inputText);
        if (embedConfig != null && inputText != null && urlMatch != null) {
          Promise.resolve(embedConfig.parseUrl(inputText)).then(
            (parseResult) => {
              setEmbedResult(parseResult);
            },
          );
        } else if (embedResult != null) {
          setEmbedResult(null);
        }
      }, 200),
    [embedConfig, embedResult],
  );

  const onClick = () => {
    if (embedResult != null) {
      embedConfig.insertNode(editor, embedResult);
      onClose();
    }
  };

  return (
    <div style={{ width: '600px' }}>
      <div className="Input__wrapper">
        <input
          type="text"
          className="Input__input"
          placeholder={embedConfig.exampleUrl}
          value={text}
          data-test-id={`${embedConfig.type}-embed-modal-url`}
          onChange={(e) => {
            const { value } = e.target;
            setText(value);
            validateText(value);
          }}
        />
      </div>
      <DialogActions>
        <Button
          disabled={!embedResult}
          onClick={onClick}
          data-test-id={`${embedConfig.type}-embed-modal-submit-btn`}>
          Embed
        </Button>
      </DialogActions>
    </div>
  );
}

/**
 * Plugin that enables automatic embedding of recognized URLs.
 * @returns {JSX.Element} The rendered auto-embed plugin.
 */
export default function AutoEmbedPlugin(): JSX.Element {
  const [modal, showModal] = useModal();

  const openEmbedModal = (embedConfig: PlaygroundEmbedConfig) => {
    // Use different dialog for emoji picker
    if (embedConfig.type === 'emoji-selector') {
      showModal(`Select ${embedConfig.contentName}`, (onClose) => (
        <EmojiPickerDialog embedConfig={embedConfig} onClose={onClose} />
      ));
    } else {
      showModal(`Embed ${embedConfig.contentName}`, (onClose) => (
        <AutoEmbedDialog embedConfig={embedConfig} onClose={onClose} />
      ));
    }
  };

  const getMenuOptions = (
    activeEmbedConfig: PlaygroundEmbedConfig,
    embedFn: () => void,
    dismissFn: () => void,
  ) => {
    return [
      new AutoEmbedOption('Dismiss', {
        onSelect: dismissFn,
      }),
      new AutoEmbedOption(`Embed ${activeEmbedConfig.contentName}`, {
        onSelect: embedFn,
      }),
    ];
  };

  return (
    <>
      {modal}
      <LexicalAutoEmbedPlugin<PlaygroundEmbedConfig>
        embedConfigs={EmbedConfigs}
        onOpenEmbedModalForConfig={openEmbedModal}
        getMenuOptions={getMenuOptions}
        menuRenderFn={(
          anchorElementRef,
          { selectedIndex, options, selectOptionAndCleanUp, setHighlightedIndex },
        ) =>
          anchorElementRef.current
            ? ReactDOM.createPortal(
              <div
                className="typeahead-popover auto-embed-menu"
                style={{
                  marginLeft: `${Math.max(
                    parseFloat(anchorElementRef.current.style.width) - 200,
                    0,
                  )}px`,
                  width: 200,
                }}>
                <AutoEmbedMenu
                  options={options}
                  selectedItemIndex={selectedIndex}
                  onOptionClick={(option: AutoEmbedOption, index: number) => {
                    setHighlightedIndex(index);
                    selectOptionAndCleanUp(option);
                  }}
                  onOptionMouseEnter={(index: number) => {
                    setHighlightedIndex(index);
                  }}
                />
              </div>,
              anchorElementRef.current,
            )
            : null
        }
      />
    </>
  );
}
