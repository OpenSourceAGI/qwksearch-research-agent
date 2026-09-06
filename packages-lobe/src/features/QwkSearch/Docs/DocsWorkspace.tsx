'use client';

import { Flexbox, Icon, Input, Markdown } from '@lobehub/ui';
import { Button, Segmented, Text, TextArea } from '@lobehub/ui/base-ui';
import { createStaticStyles } from 'antd-style';
import { FileTextIcon, PlusIcon } from 'lucide-react';
import { memo, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router';

import { useDocsStore } from './store';

const AUTOSAVE_DELAY_MS = 1200;

const styles = createStaticStyles(({ css, cssVar }) => ({
  editor: css`
    flex: 1;
    min-height: 0;

    textarea {
      resize: none;

      height: 100% !important;
      padding: 16px;
      border: none;

      font-family: ${cssVar.fontFamilyCode};
      font-size: 14px;
      line-height: 1.7;

      background: transparent;
      box-shadow: none !important;
    }
  `,
  preview: css`
    overflow-y: auto;
    flex: 1;
    min-height: 0;
    padding-block: 8px 24px;
    padding-inline: 16px;
  `,
  root: css`
    height: 100%;
    background: ${cssVar.colorBgContainer};
  `,
  title: css`
    input {
      padding-inline: 0;
      border: none;

      font-size: 22px;
      font-weight: 600;

      background: transparent;
      box-shadow: none !important;
    }
  `,
  toolbar: css`
    flex: none;
    padding-block: 12px 8px;
    padding-inline: 16px;
    border-block-end: 1px solid ${cssVar.colorBorderSecondary};
  `,
}));

const EmptyState = memo(() => {
  const { t } = useTranslation('qwksearch');
  const navigate = useNavigate();
  const create = useDocsStore((s) => s.create);

  return (
    <Flexbox align={'center'} gap={12} height={'100%'} justify={'center'} padding={24}>
      <Icon icon={FileTextIcon} size={40} />
      <Text strong>{t('docs.empty.title')}</Text>
      <Text style={{ maxWidth: 360, textAlign: 'center' }} type={'secondary'}>
        {t('docs.empty.description')}
      </Text>
      <Button
        icon={<Icon icon={PlusIcon} />}
        type={'primary'}
        onClick={async () => {
          const created = await create();
          if (created) navigate(`/docs/${created.id}`);
        }}
      >
        {t('docs.actions.newDocument')}
      </Button>
    </Flexbox>
  );
});

/**
 * QwkSearch Docs: Markdown research documents stored in D1 next to the chat.
 * Autosaves drafts after a short idle delay; the sidebar lists documents.
 */
const DocsWorkspace = memo(() => {
  const { t } = useTranslation('qwksearch');
  const { docId } = useParams<{ docId?: string }>();
  const [mode, setMode] = useState<'write' | 'preview'>('write');

  const [activeId, draft, dirty, saving, error, initialized, documents] = useDocsStore((s) => [
    s.activeId,
    s.draft,
    s.dirty,
    s.saving,
    s.error,
    s.initialized,
    s.documents,
  ]);
  const [fetchDocuments, select, updateDraft, save] = useDocsStore((s) => [
    s.fetchDocuments,
    s.select,
    s.updateDraft,
    s.save,
  ]);

  useEffect(() => {
    if (!initialized) void fetchDocuments();
  }, [fetchDocuments, initialized]);

  // Keep the active document in sync with the route once the list is loaded.
  useEffect(() => {
    if (!initialized) return;
    const id = docId ? Number.parseInt(docId, 10) : undefined;
    if (id !== activeId && (id === undefined || documents.some((doc) => doc.id === id))) select(id);
  }, [activeId, docId, documents, initialized, select]);

  // Debounced autosave.
  useEffect(() => {
    if (!dirty) return;
    const timer = setTimeout(() => void save(), AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [dirty, draft, save]);

  if (initialized && activeId === undefined) return <EmptyState />;

  const status = saving
    ? t('docs.actions.saving')
    : dirty
      ? t('docs.actions.save')
      : t('docs.actions.saved');

  return (
    <Flexbox className={styles.root}>
      <Flexbox className={styles.toolbar} gap={8}>
        <Flexbox horizontal align={'center'} gap={12} justify={'space-between'}>
          <Input
            className={styles.title}
            placeholder={t('docs.editor.titlePlaceholder')}
            value={draft.title}
            onChange={(e) => updateDraft({ title: e.target.value })}
          />
          <Flexbox horizontal align={'center'} gap={12}>
            <Text style={{ fontSize: 12, whiteSpace: 'nowrap' }} type={'secondary'}>
              {error === 'save' ? t('docs.error.save') : status}
            </Text>
            <Segmented
              size={'small'}
              value={mode}
              options={[
                { label: t('docs.editor.write'), value: 'write' },
                { label: t('docs.editor.preview'), value: 'preview' },
              ]}
              onChange={(value) => setMode(value as 'write' | 'preview')}
            />
          </Flexbox>
        </Flexbox>
      </Flexbox>

      {mode === 'write' ? (
        <div className={styles.editor}>
          <TextArea
            placeholder={t('docs.editor.contentPlaceholder')}
            value={draft.content}
            onBlur={() => void save()}
            onChange={(e) => updateDraft({ content: e.target.value })}
          />
        </div>
      ) : (
        <div className={styles.preview}>
          <Markdown>{draft.content}</Markdown>
        </div>
      )}
    </Flexbox>
  );
});

DocsWorkspace.displayName = 'QwkSearchDocsWorkspace';

export default DocsWorkspace;
