'use client';

import * as React from 'react';

import { MarkdownPlugin } from '@platejs/markdown';
import { FileInputIcon } from 'lucide-react';
import { useEditorRef } from 'platejs/react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { ToolbarButton } from './toolbar';

/** Counterpart to `./export-toolbar-button.tsx`; Markdown in, Markdown out. */
export function ImportToolbarButton(
  props: React.ComponentProps<typeof DropdownMenu>,
) {
  const editor = useEditorRef();
  const [open, setOpen] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const onFile = React.useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      // Reset first so re-picking the same file still fires `change`.
      event.target.value = '';
      if (!file) return;

      const nodes = editor
        .getApi(MarkdownPlugin)
        .markdown.deserialize(await file.text());

      editor.tf.insertNodes(nodes, { at: [editor.children.length] });
      editor.tf.focus();
    },
    [editor],
  );

  return (
    <>
      <input
        accept=".md,.markdown,.mdx,text/markdown"
        className="hidden"
        onChange={(event) => void onFile(event)}
        ref={inputRef}
        type="file"
      />

      <DropdownMenu open={open} onOpenChange={setOpen} modal={false} {...props}>
        <DropdownMenuTrigger asChild>
          <ToolbarButton isDropdown pressed={open} toolbarId="import">
            <FileInputIcon />
          </ToolbarButton>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start">
          <DropdownMenuGroup>
            <DropdownMenuItem onSelect={() => inputRef.current?.click()}>
              Import from Markdown
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
