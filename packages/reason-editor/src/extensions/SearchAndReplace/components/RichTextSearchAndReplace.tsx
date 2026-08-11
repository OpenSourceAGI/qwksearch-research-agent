/**
 * Toolbar control (React) for the SearchAndReplace extension, which adds searching and replacing text. Renders the button and dispatches the matching editor command when activated.
 */

import { useEffect, useId, useState } from 'react';

import {
  ActionButton,
  Button,
  IconComponent,
  Input,
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Checkbox,
} from '@/components';
import { SearchAndReplace } from '@/extensions/SearchAndReplace/SearchAndReplace';
import { useActive } from '@/hooks/useActive';
import { useButtonProps } from '@/hooks/useButtonProps';
import { useLocale } from '@/locales';
import { useEditorInstance } from '@/store/editor';

export function RichTextSearchAndReplace() {
  const { t } = useLocale();

  const editor = useEditorInstance();
  const buttonProps = useButtonProps(SearchAndReplace.name);

  const id = useId();
  const searchInputId = `${id}-search`;
  const replaceInputId = `${id}-replace`;
  const caseSensitiveId = `${id}-case-sensitive`;

  const {
    icon = undefined,
    tooltip = undefined,
    shortcutKeys = undefined,
    tooltipOptions = {},
    action = undefined,
    isActive = undefined,
  } = buttonProps?.componentProps ?? {};

  const { disabled } = useActive(isActive);

  const [visible, setVisible] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [replaceTerm, setReplaceTerm] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [result, setResult] = useState('');

  const updateResult = () => {
    const total = editor?.storage?.searchAndReplace?.results?.length ?? 0;
    const index = total ? (editor?.storage?.searchAndReplace?.resultIndex ?? 0) + 1 : 0;

    setResult(`${index}/${total}`);
  };

  useEffect(() => {
    if (editor) {
      updateResult();
    }
  }, [editor]);

  const onAction = () => {
    if (disabled) return;

    if (action) action();
  };

  const updateSearchReplace = (clearIndex = false) => {
    if (!editor) return;

    if (clearIndex) editor?.commands?.resetIndex?.();

    editor?.commands?.setSearchTerm?.(searchTerm);
    editor?.commands?.setReplaceTerm?.(replaceTerm);
    editor?.commands?.setCaseSensitive?.(caseSensitive);

    updateResult();
  };

  const goToSelection = () => {
    if (!editor) return;

    const { results, resultIndex } = editor.storage.searchAndReplace;
    //@ts-expect-error
    const position: Range = results[resultIndex];

    if (!position) return;
    //@ts-expect-error
    editor?.commands?.setTextSelection?.(position);

    const { node } = editor.view.domAtPos(editor.state.selection.anchor);
    if (node instanceof HTMLElement) node.scrollIntoView({ behavior: 'smooth', block: 'center' });

    updateResult();
  };

  useEffect(() => {
    if (!searchTerm.trim()) clear();
    if (searchTerm.trim()) updateSearchReplace(true);
  }, [searchTerm]);

  useEffect(() => {
    if (replaceTerm.trim()) updateSearchReplace();
  }, [replaceTerm]);

  useEffect(() => {
    updateSearchReplace(true);
  }, [caseSensitive]);

  const replace = () => {
    editor?.commands?.replace?.();
    goToSelection();
  };

  const next = () => {
    editor?.commands?.nextSearchResult?.();
    goToSelection();
  };

  const previous = () => {
    editor?.commands?.previousSearchResult?.();
    goToSelection();
  };

  const clear = () => {
    setSearchTerm('');
    setReplaceTerm('');

    // Drop the search decorations too, otherwise the previous matches stay highlighted
    editor?.commands?.setSearchTerm?.('');
    editor?.commands?.setReplaceTerm?.('');
    editor?.commands?.resetIndex?.();

    setResult('0/0');
  };

  const replaceAll = () => {
    editor?.commands?.replaceAll?.();
    setResult('0/0');
  };

  if (!buttonProps) {
    return <></>;
  }

  return (
    <Popover onOpenChange={setVisible} open={visible}>
      <PopoverTrigger asChild disabled={disabled}>
        <ActionButton
          action={onAction}
          disabled={disabled}
          icon={icon}
          shortcutKeys={shortcutKeys}
          tooltip={tooltip}
          tooltipOptions={tooltipOptions}
        />
      </PopoverTrigger>

      <PopoverContent
        align='start'
        hideWhenDetached
        side='bottom'
        className='richtext-w-[320px] richtext-max-w-[calc(100vw_-_16px)] richtext-space-y-3'
      >
        <div className='richtext-space-y-1.5'>
          <div className='richtext-flex richtext-items-center richtext-justify-between richtext-gap-2'>
            <Label htmlFor={searchInputId}>{t('editor.search.dialog.text')}</Label>

            <span className='richtext-shrink-0 richtext-text-xs richtext-tabular-nums richtext-text-muted-foreground'>
              {result}
            </span>
          </div>

          <div className='richtext-flex richtext-items-center richtext-gap-1.5'>
            <Input
              autoFocus
              className='richtext-min-w-0 richtext-flex-1'
              id={searchInputId}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('editor.search.dialog.text')}
              type='text'
              value={searchTerm}
            />

            <Button
              aria-label='Previous match'
              className='richtext-shrink-0'
              onClick={previous}
              size='icon'
              title='Previous match'
              variant='outline'
            >
              <IconComponent name='ChevronUp' />
            </Button>

            <Button
              aria-label='Next match'
              className='richtext-shrink-0'
              onClick={next}
              size='icon'
              title='Next match'
              variant='outline'
            >
              <IconComponent name='ChevronDown' />
            </Button>
          </div>
        </div>

        <div className='richtext-space-y-1.5'>
          <Label htmlFor={replaceInputId}>{t('editor.replace.dialog.text')}</Label>

          <Input
            className='richtext-w-full'
            id={replaceInputId}
            onChange={(e) => setReplaceTerm(e.target.value)}
            placeholder={t('editor.replace.dialog.text')}
            type='text'
            value={replaceTerm}
          />
        </div>

        <div className='richtext-flex richtext-items-center richtext-justify-between richtext-gap-2'>
          <div className='richtext-flex richtext-min-w-0 richtext-items-center richtext-gap-2'>
            <Checkbox
              checked={caseSensitive}
              id={caseSensitiveId}
              onCheckedChange={(v) => {
                setCaseSensitive(v as boolean);
                editor?.commands?.setCaseSensitive?.(v as boolean);
              }}
            />

            <Label className='richtext-cursor-pointer richtext-truncate' htmlFor={caseSensitiveId}>
              {t('editor.replace.caseSensitive')}
            </Label>
          </div>

          <Button className='richtext-shrink-0' onClick={clear} size='sm' variant='ghost'>
            Clear
          </Button>
        </div>

        <div className='richtext-flex richtext-items-center richtext-gap-2'>
          <Button className='richtext-min-w-0 richtext-flex-1' onClick={replace} variant='outline'>
            {t('editor.replace.dialog.text')}
          </Button>

          <Button className='richtext-min-w-0 richtext-flex-1' onClick={replaceAll}>
            {t('editor.replaceAll.dialog.text')}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
