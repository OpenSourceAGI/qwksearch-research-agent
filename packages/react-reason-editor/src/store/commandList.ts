/**
 * Reactive store holding the list of available slash-command menu items. Lets the slash-command extension and its UI share and update the command list.
 */

import { createSignal, useSignal } from 'reactjs-signal';

import { type CommandList } from '@/extensions/SlashCommand/types';

const useSignalCommandListStore = createSignal<CommandList[]>([]);

export function useSignalCommandList() {
  const [commandList, setCommandList] = useSignal(useSignalCommandListStore);

  return [commandList, setCommandList] as const;
}
