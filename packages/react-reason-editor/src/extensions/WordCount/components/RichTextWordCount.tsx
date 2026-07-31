/**
 * Toolbar control (React) for the WordCount extension, which adds word and character counting. Renders the button and dispatches the matching editor command when activated.
 */

import { useEffect, useState } from 'react';

import {
  ActionButton,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components';
import { WordCount } from '@/extensions/WordCount/WordCount';
import { getWordCountStats, type WordCountStats } from '@/extensions/WordCount/utils/wordCount';
import { useActive } from '@/hooks/useActive';
import { useButtonProps } from '@/hooks/useButtonProps';
import { useEditorInstance } from '@/store/editor';

const EMPTY_STATS: WordCountStats = {
  words: 0,
  charactersWithSpaces: 0,
  charactersNoSpaces: 0,
  sentences: 0,
  paragraphs: 0,
  links: 0,
  images: 0,
};

export function RichTextWordCount() {
  const editor = useEditorInstance();
  const buttonProps = useButtonProps(WordCount.name);

  const {
    icon = undefined,
    tooltip = undefined,
    shortcutKeys = undefined,
    tooltipOptions = {},
    isActive = undefined,
  } = buttonProps?.componentProps ?? {};

  const { disabled } = useActive(isActive);

  const [visible, setVisible] = useState(false);
  const [stats, setStats] = useState<WordCountStats>(EMPTY_STATS);

  useEffect(() => {
    if (!editor || !visible) return;

    const update = () => setStats(getWordCountStats(editor));

    update();
    editor.on('update', update);
    editor.on('selectionUpdate', update);

    return () => {
      editor.off('update', update);
      editor.off('selectionUpdate', update);
    };
  }, [editor, visible]);

  if (!buttonProps) {
    return <></>;
  }

  const rows: { label: string; value: number }[] = [
    { label: 'Words', value: stats.words },
    { label: 'Characters (with spaces)', value: stats.charactersWithSpaces },
    { label: 'Characters (no spaces)', value: stats.charactersNoSpaces },
    { label: 'Sentences', value: stats.sentences },
    { label: 'Paragraphs', value: stats.paragraphs },
    { label: 'Links', value: stats.links },
    { label: 'Images', value: stats.images },
  ];

  return (
    <Popover onOpenChange={setVisible} open={visible}>
      <PopoverTrigger asChild disabled={disabled}>
        <ActionButton
          disabled={disabled}
          icon={icon}
          shortcutKeys={shortcutKeys}
          tooltip={tooltip}
          tooltipOptions={tooltipOptions}
        />
      </PopoverTrigger>

      <PopoverContent align='start' className='richtext-w-[260px]' hideWhenDetached side='bottom'>
        <div className='richtext-mb-[10px] richtext-flex richtext-items-center richtext-justify-between'>
          <span className='richtext-text-sm richtext-font-semibold'>Word Count</span>
        </div>

        <table className='richtext-w-full richtext-text-sm'>
          <tbody>
            {rows.map((row) => (
              <tr
                className='richtext-border-b richtext-border-border last:richtext-border-b-0'
                key={row.label}
              >
                <td className='richtext-py-[6px] richtext-pr-2 richtext-text-muted-foreground'>
                  {row.label}
                </td>

                <td className='richtext-py-[6px] richtext-text-right richtext-font-semibold richtext-tabular-nums'>
                  {row.value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </PopoverContent>
    </Popover>
  );
}
