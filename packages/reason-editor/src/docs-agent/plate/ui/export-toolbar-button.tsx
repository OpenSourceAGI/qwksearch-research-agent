'use client';

import * as React from 'react';

import { MarkdownPlugin } from '@platejs/markdown';
import { FileOutputIcon } from 'lucide-react';
import { useEditorRef } from 'platejs/react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { downloadFromBlob } from '@/utils/download';

import { ToolbarButton } from './toolbar';

/**
 * Markdown is the only export format offered here. The registry's own export
 * menu also does HTML/PDF/image, but those go through the static (`*-static`)
 * renderer plus `pdf-lib`/`html2canvas`, none of which this package installs;
 * the Tiptap side's `ExportPdf`/`ExportWord` extensions remain the route for
 * those formats.
 */
export function ExportToolbarButton(
  props: React.ComponentProps<typeof DropdownMenu>,
) {
  const editor = useEditorRef();
  const [open, setOpen] = React.useState(false);

  const toMarkdown = React.useCallback(
    () => editor.getApi(MarkdownPlugin).markdown.serialize(),
    [editor],
  );

  return (
    <DropdownMenu open={open} onOpenChange={setOpen} modal={false} {...props}>
      <DropdownMenuTrigger asChild>
        <ToolbarButton isDropdown pressed={open} toolbarId="export">
          <FileOutputIcon />
        </ToolbarButton>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start">
        <DropdownMenuGroup>
          <DropdownMenuItem
            onSelect={() => {
              void downloadFromBlob(
                new Blob([toMarkdown()], { type: 'text/markdown;charset=utf-8' }),
                'document.md',
              );
            }}
          >
            Export as Markdown
          </DropdownMenuItem>

          <DropdownMenuItem
            onSelect={() => {
              void navigator.clipboard?.writeText(toMarkdown());
            }}
          >
            Copy as Markdown
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
