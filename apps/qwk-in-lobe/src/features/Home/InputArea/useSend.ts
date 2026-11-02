import { AGENT_CHAT_TOPIC_URL, AGENT_CHAT_URL } from '@lobechat/const';
import { toast } from '@lobehub/ui/base-ui';
import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useActiveWorkspaceId } from '@/business/client/hooks/useActiveWorkspaceId';
import { useActiveWorkspaceSlug } from '@/business/client/hooks/useActiveWorkspaceSlug';
import { buildTaskHandoffPath } from '@/features/AgentTaskManager/taskHandoff';
import type { SendButtonHandler } from '@/features/ChatInput/store/initialState';
import { buildMessageContextSelections } from '@/features/ChatInput/utils/contextSelections';
import { OPENROUTER_PROVIDER_ID } from '@/features/GuestOpenRouter/accountSync';
import { resolveOpenRouterChatRoute } from '@/features/GuestOpenRouter/chatKey';
import { useResourceAccess } from '@/features/ResourcePermission/useResourceAccess';
import { useHomeDailyBrief } from '@/hooks/useHomeDailyBrief';
import { usePermission } from '@/hooks/usePermission';
import { useQueryRoute } from '@/hooks/useQueryRoute';
import { agentService } from '@/services/agent';
import { useAgentStore } from '@/store/agent';
import { agentByIdSelectors, builtinAgentSelectors } from '@/store/agent/selectors';
import { useChatStore } from '@/store/chat';
import { fileChatSelectors, useFileStore } from '@/store/file';
import { useGlobalStore } from '@/store/global';
import { useHomeStore } from '@/store/home';
import { useTaskStore } from '@/store/task';

import { useResolvedHomeAgentId } from '../AgentSelect/useResolvedHomeAgentId';
import type { HomeMode } from '../types';
import { taskNameFromMessage } from './taskName';

/**
 * Trim trailing ellipsis the LLM uses on hint placeholders so the sent
 * message doesn't carry the cosmetic suffix.
 */
const stripHintEllipsis = (hint: string): string => hint.replace(/\s*(?:\.{3,}|…)\s*$/, '').trim();

/**
 * Make sure the agent's config is hydrated into `agentMap` before we call
 * `sendMessage`. Without this, sending to an agent the user just picked from
 * the home AgentSelect (and never opened in this session) silently fails:
 * `sendMessage` reaches `getAgentConfigById(agentId)` which returns `undefined`
 * from `agentMap`, the `{ model, provider }` destructure throws, and the
 * surrounding catch swallows it — so the chat page mounts with optimistic
 * messages but the runtime never starts.
 */
const ensureAgentConfigLoaded = async (agentId: string): Promise<void> => {
  const agentState = useAgentStore.getState();
  if (agentState.agentMap[agentId]) return;
  const config = await agentService.getAgentConfigById(agentId);
  if (config) agentState.internal_dispatchAgentMap(agentId, config);
};

/**
 * How long a send waits for the agent config before giving up on the main
 * chat. A server that hangs instead of failing would otherwise leave the send
 * button spinning with nothing sent.
 */
export const AGENT_CONFIG_TIMEOUT_MS = 8000;

/**
 * Whether the agent's config could be loaded. The chat cannot run without it —
 * no agent resolved yet, or the server failing (or taking too long) to answer —
 * and the home input then says so and keeps the draft rather than doing
 * nothing.
 */
const loadAgentConfig = async (agentId: string | undefined): Promise<boolean> => {
  if (!agentId) return false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      ensureAgentConfigLoaded(agentId),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`timed out after ${AGENT_CONFIG_TIMEOUT_MS}ms`)),
          AGENT_CONFIG_TIMEOUT_MS,
        );
      }),
    ]);
  } catch (error) {
    console.error('[home:send] Could not load the agent config:', error);
    return false;
  } finally {
    clearTimeout(timer);
  }
  return !!useAgentStore.getState().agentMap[agentId];
};

interface PendingTaskRun {
  agentId: string;
  identifier: string;
  instruction: string;
  workspaceId: string | null;
}

export const useSend = (mode: HomeMode = 'chat') => {
  const { t } = useTranslation('home');
  const router = useQueryRoute();
  const activeWorkspaceId = useActiveWorkspaceId();
  const activeWorkspaceSlug = useActiveWorkspaceSlug();
  const sendMessage = useChatStore((s) => s.sendMessage);
  const clearChatUploadFileList = useFileStore((s) => s.clearChatUploadFileList);
  const clearChatContextSelections = useFileStore((s) => s.clearChatContextSelections);
  const restoreChatContextSelections = useFileStore((s) => s.restoreChatContextSelections);

  const homeInputLoading = useHomeStore((s) => s.homeInputLoading);
  const createTask = useTaskStore((s) => s.createTask);
  const runTask = useTaskStore((s) => s.runTask);
  const toggleTaskAgentPanel = useGlobalStore((s) => s.toggleTaskAgentPanel);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const pendingTaskRunRef = useRef<PendingTaskRun | null>(null);

  const inboxAgentId = useAgentStore(builtinAgentSelectors.inboxAgentId);
  const { agentId: selectedAgentId } = useResolvedHomeAgentId();
  const agentId = selectedAgentId;
  const contextSelectionKey = `home:${mode}:${selectedAgentId ?? 'unresolved'}`;
  const { allowed: canCreateContent } = usePermission('create_content');
  const agentVisibility = useAgentStore((s) =>
    selectedAgentId ? s.agentMap[selectedAgentId]?.visibility : undefined,
  );
  const gatedResourceId =
    selectedAgentId && selectedAgentId !== inboxAgentId && agentVisibility !== 'private'
      ? selectedAgentId
      : undefined;
  const { canUseResource } = useResourceAccess('agent', gatedResourceId);

  // Daily-brief hint paired with the fixed Home greeting. Pressing Enter on an
  // empty input accepts that hint without changing the visible pair.
  const { currentPair } = useHomeDailyBrief();

  const send = useCallback<SendButtonHandler>(
    async ({ getEditorData, getMarkdownContent }) => {
      const { inputMessage, mainInputEditor } = useChatStore.getState();
      // Prefer the live editor content over the cached `inputMessage`.
      // `onMarkdownContentChange` is wired through the editor's async
      // `onChange`, so a fast type-then-Enter sequence can fire before the
      // cache catches up and the empty-message guard would bail incorrectly.
      const typed = (getMarkdownContent?.() ?? inputMessage ?? '').trim();
      const fileList = fileChatSelectors.chatUploadFileList(useFileStore.getState());
      const contextList = fileChatSelectors.chatContextSelections(contextSelectionKey)(
        useFileStore.getState(),
      );
      const { sendAsAgent, sendAsGroup, sendAsWrite, sendAsResearch, inputActiveMode } =
        useHomeStore.getState();

      // If the user pressed Enter on an empty input, fall back to the
      // currently displayed daily-brief hint (with cosmetic ellipsis stripped)
      // and rotate the carousel so the next press shows / sends a different
      // pair.
      const hint = mode === 'chat' && currentPair?.hint ? stripHintEllipsis(currentPair.hint) : '';
      const usedHint = !typed && !!hint;
      const message = typed || hint;

      // When falling back to the hint, the editor is empty — but its JSON
      // state still contains root nodes (e.g. `{ type: 'doc' }`), which is
      // truthy under `Object.keys(editorData).length > 0`. That makes the
      // user-message renderer take the RichTextMessage branch and draw
      // nothing, so the chat shows a blank user bubble while the agent
      // happily processes the hint text. Skip editorData in that case so
      // the renderer falls back to the markdown `content`.
      const editorData = usedHint
        ? undefined
        : (getEditorData?.() ?? mainInputEditor?.getJSONState());

      if (!canCreateContent) return;

      if ((mode === 'task' || !inputActiveMode) && !canUseResource) return;

      // Task persistence does not support attachments or context yet. Check
      // this before the empty-message guard so an attachment-only submission
      // explains why it cannot proceed instead of appearing inert.
      if (mode === 'task' && (fileList.length > 0 || contextList.length > 0)) {
        toast.error(t('dashboard.task.unsupportedContext'));
        return;
      }

      // Require input content (except for default inbox which can have files/context)
      if (!message && fileList.length === 0 && contextList.length === 0) return;

      let submitted = false;
      try {
        const { contextSelections, pageSelections } = buildMessageContextSelections(contextList);

        // Task mode is a commitment, not a proposal: the row is written and the
        // run is launched here. Routing it through the agent would leave both
        // outcomes to a model that is told elsewhere not to start work on its
        // own — pressing send in this mode IS the instruction to start.
        if (mode === 'task') {
          if (!message || !selectedAgentId) return;
          setIsSubmitting(true);
          const pendingTaskRun = pendingTaskRunRef.current;
          const canRetryPendingTask =
            pendingTaskRun?.agentId === selectedAgentId &&
            pendingTaskRun.instruction === message &&
            pendingTaskRun.workspaceId === (activeWorkspaceId ?? null);

          let taskRun = canRetryPendingTask ? pendingTaskRun : null;
          if (!taskRun) {
            const created = await createTask({
              assigneeAgentId: selectedAgentId,
              editorData,
              instruction: message,
              name: taskNameFromMessage(message),
              visibility: activeWorkspaceId ? 'private' : undefined,
            });
            if (!created?.identifier) throw new Error('Task creation returned no identifier');
            taskRun = {
              agentId: created.assigneeAgentId ?? selectedAgentId,
              identifier: created.identifier,
              instruction: message,
              workspaceId: activeWorkspaceId ?? null,
            };
            pendingTaskRunRef.current = taskRun;
          }

          const result = await runTask(taskRun.identifier, undefined, { throwOnError: true });
          if (!result?.topicId) throw new Error('Task run did not return a topic');
          pendingTaskRunRef.current = null;
          submitted = true;
          toggleTaskAgentPanel(true);
          router.push(buildTaskHandoffPath(taskRun.agentId, result.topicId));
          return;
        }

        switch (inputActiveMode) {
          case 'agent': {
            await sendAsAgent({
              contextSelections,
              editorData,
              message,
              pageSelections,
              workspaceSlug: activeWorkspaceSlug,
            });
            submitted = true;
            break;
          }

          case 'group': {
            await sendAsGroup({
              contextSelections,
              editorData,
              message,
              pageSelections,
              workspaceSlug: activeWorkspaceSlug,
            });
            submitted = true;
            break;
          }

          case 'write': {
            await sendAsWrite({
              contextSelections,
              editorData,
              message,
              pageSelections,
              workspaceSlug: activeWorkspaceSlug,
            });
            submitted = true;
            break;
          }

          case 'research': {
            await sendAsResearch(message);
            submitted = true;
            break;
          }

          default: {
            // The home input hands every chat to LobeHub's own chat runtime —
            // the agent's full tool set, its topics and history — never to a
            // stripped-down fallback. When that chat can't start, the draft is
            // kept and the visitor is told, so pressing send is never inert.
            if (!(await loadAgentConfig(selectedAgentId)) || !selectedAgentId) {
              toast.error(t('dashboard.submitFailed'));
              return;
            }

            // An OpenRouter chat with no key the server can read fails on its
            // first message. Copy the browser's key to the account, or ask for
            // one (keeping the draft if that is declined).
            const provider = agentByIdSelectors.getAgentModelProviderById(selectedAgentId)(
              useAgentStore.getState(),
            );
            if (provider === OPENROUTER_PROVIDER_ID) {
              const route = await resolveOpenRouterChatRoute();
              if (route === 'cancelled') return;
              if (route === 'failed') {
                toast.error(t('dashboard.submitFailed'));
                return;
              }
            }

            sendMessage({
              context: {
                agentId: selectedAgentId,
                isolatedTopic: true,
                ...(activeWorkspaceSlug ? { workspaceSlug: activeWorkspaceSlug } : {}),
              },
              contextSelections,
              contexts: contextList,
              editorData,
              files: fileList,
              message,
              onPreflightFailure: () => {
                restoreChatContextSelections(contextSelectionKey, contextList);
              },
              onTopicCreated: (topicId) => {
                router.replace(AGENT_CHAT_TOPIC_URL(selectedAgentId, topicId, false));
              },
              pageSelections,
            });

            submitted = true;
            router.push(AGENT_CHAT_URL(selectedAgentId, false));
          }
        }
      } catch (error) {
        console.error('[home:send]', error);
        toast.error(t('dashboard.submitFailed'));
      } finally {
        // Preserve the complete draft when creation or execution fails. The
        // editor, files and context are one unit from the user's perspective.
        if (submitted) {
          clearChatUploadFileList();
          clearChatContextSelections(contextSelectionKey);
          mainInputEditor?.clearContent();
        }
        setIsSubmitting(false);
      }
    },
    [
      activeWorkspaceSlug,
      activeWorkspaceId,
      sendMessage,
      clearChatContextSelections,
      restoreChatContextSelections,
      clearChatUploadFileList,
      contextSelectionKey,
      router,
      currentPair,
      mode,
      createTask,
      runTask,
      toggleTaskAgentPanel,
      inboxAgentId,
      selectedAgentId,
      canUseResource,
      canCreateContent,
      t,
    ],
  );

  return {
    agentId,
    contextSelectionKey,
    loading: homeInputLoading || isSubmitting,
    send,
  };
};
