'use client';

import { Flexbox, Icon } from '@lobehub/ui';
import { ActionIcon, Text } from '@lobehub/ui/base-ui';
import { createStaticStyles, cx } from 'antd-style';
import { FileTextIcon, FolderIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import { memo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';

import { useDocsStore } from './store';

const styles = createStaticStyles(({ css, cssVar }) => ({
  active: css`
    background: ${cssVar.colorFillSecondary};
  `,
  header: css`
    padding-block: 12px 8px;
    padding-inline: 12px 8px;
  `,
  item: css`
    cursor: pointer;

    padding-block: 6px;
    padding-inline: 10px;
    border-radius: ${cssVar.borderRadius};

    &:hover {
      background: ${cssVar.colorFillTertiary};
    }

    .qwk-doc-actions {
      opacity: 0;
    }

    &:hover .qwk-doc-actions {
      opacity: 1;
    }
  `,
  list: css`
    overflow-y: auto;
    flex: 1;
    padding-block: 0 12px;
    padding-inline: 8px;
  `,
  title: css`
    overflow: hidden;
    font-size: 13px;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
}));

/**
 * Document list shown in the nav panel while `/docs` is active. Selecting a
 * document routes to `/docs/:docId`, so deep links and browser history work.
 */
const DocsSidebar = memo(() => {
  const { t } = useTranslation('qwksearch');
  const navigate = useNavigate();
  const [documents, activeId, initialized, error] = useDocsStore((s) => [
    s.documents,
    s.activeId,
    s.initialized,
    s.error,
  ]);
  const [fetchDocuments, create, remove] = useDocsStore((s) => [s.fetchDocuments, s.create, s.remove]);

  useEffect(() => {
    if (!initialized) void fetchDocuments();
  }, [fetchDocuments, initialized]);

  const handleCreate = async () => {
    const created = await create();
    if (created) navigate(`/docs/${created.id}`);
  };

  const handleRemove = async (id: number, title: string) => {
    if (!window.confirm(t('docs.confirmDelete', { title }))) return;
    await remove(id);
    const next = useDocsStore.getState().activeId;
    navigate(next ? `/docs/${next}` : '/docs');
  };

  return (
    <Flexbox height={'100%'}>
      <Flexbox horizontal align={'center'} className={styles.header} justify={'space-between'}>
        <Text strong>{t('docs.title')}</Text>
        <ActionIcon
          aria-label={t('docs.actions.newDocument')}
          icon={PlusIcon}
          size={'small'}
          title={t('docs.actions.newDocument')}
          onClick={handleCreate}
        />
      </Flexbox>
      <Flexbox className={styles.list} gap={2}>
        {error === 'loginRequired' && (
          <Text style={{ padding: 8 }} type={'secondary'}>
            {t('docs.error.loginRequired')}
          </Text>
        )}
        {documents.map((doc) => {
          const title = doc.title || doc.name || t('docs.untitled');
          return (
            <Flexbox
              horizontal
              align={'center'}
              className={cx(styles.item, doc.id === activeId && styles.active)}
              gap={8}
              key={doc.id}
              onClick={() => navigate(`/docs/${doc.id}`)}
            >
              <Icon icon={doc.isFolder ? FolderIcon : FileTextIcon} size={14} />
              <span className={styles.title} style={{ flex: 1 }}>
                {title}
              </span>
              <span className={'qwk-doc-actions'} onClick={(e) => e.stopPropagation()}>
                <ActionIcon
                  aria-label={t('docs.actions.delete')}
                  icon={Trash2Icon}
                  size={'small'}
                  title={t('docs.actions.delete')}
                  onClick={() => handleRemove(doc.id, title)}
                />
              </span>
            </Flexbox>
          );
        })}
      </Flexbox>
    </Flexbox>
  );
});

DocsSidebar.displayName = 'QwkSearchDocsSidebar';

export default DocsSidebar;
