'use client';

import { DraggablePanel, Flexbox, Icon, Input, Markdown } from '@lobehub/ui';
import { ActionIcon, Button, Skeleton, Tag, Text } from '@lobehub/ui/base-ui';
import { createStaticStyles } from 'antd-style';
import {
  BookOpenIcon,
  CheckIcon,
  CopyIcon,
  ExternalLinkIcon,
  SendIcon,
  SparklesIcon,
  StarIcon,
  XIcon,
} from 'lucide-react';
import { memo, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  ARTICLE_PANEL_MIN_WIDTH,
  articleBodyMarkdown,
  useArticlePanelStore,
} from './store';
import { useArticleLinkInterceptor } from './useArticleLinkInterceptor';

const styles = createStaticStyles(({ css, cssVar }) => ({
  body: css`
    overflow-y: auto;
    flex: 1 1 auto;
    min-height: 0;
    padding-block: 12px 24px;
    padding-inline: 20px;
  `,
  cite: css`
    font-size: 12px;
    color: ${cssVar.colorTextTertiary};
    word-break: break-word;

    a {
      color: inherit;
    }
  `,
  container: css`
    height: 100%;
    background: ${cssVar.colorBgContainer};
  `,
  followup: css`
    justify-content: flex-start;
    height: auto;
    padding-block: 6px;
    text-align: start;
    white-space: normal;
  `,
  header: css`
    flex: none;
    padding-block: 12px;
    padding-inline: 16px 12px;
    border-block-end: 1px solid ${cssVar.colorBorderSecondary};
  `,
  qaAnswer: css`
    padding-block: 8px;
    padding-inline: 12px;
    border-radius: ${cssVar.borderRadiusLG};
    background: ${cssVar.colorFillQuaternary};
  `,
  qaQuestion: css`
    font-weight: 600;
  `,
  question: css`
    flex: none;
    padding-block: 12px;
    padding-inline: 16px;
    border-block-start: 1px solid ${cssVar.colorBorderSecondary};
    background: ${cssVar.colorBgContainer};
  `,
  section: css`
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.02em;
    color: ${cssVar.colorTextSecondary};
    text-transform: uppercase;
  `,
  title: css`
    overflow: hidden;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;

    font-size: 15px;
    font-weight: 600;
    line-height: 1.35;
  `,
}));

const ArticleBody = memo(() => {
  const { t } = useTranslation('qwksearch');
  const [article, loading, error, followups, generatingFollowups, qa, asking] =
    useArticlePanelStore((s) => [
      s.article,
      s.loading,
      s.error,
      s.followups,
      s.generatingFollowups,
      s.qa,
      s.asking,
    ]);
  const [generateFollowups, ask] = useArticlePanelStore((s) => [s.generateFollowups, s.ask]);

  if (loading) {
    return (
      <Flexbox gap={12} padding={20}>
        <Text type={'secondary'}>{t('article.loading')}</Text>
        <Skeleton.Text rows={8} />
      </Flexbox>
    );
  }

  if (error && !article) {
    return (
      <Flexbox align={'center'} gap={8} padding={24} style={{ textAlign: 'center' }}>
        <Icon icon={BookOpenIcon} size={32} />
        <Text type={'secondary'}>{t(`article.error.${error}`)}</Text>
      </Flexbox>
    );
  }

  if (!article) {
    return (
      <Flexbox align={'center'} gap={8} padding={24} style={{ textAlign: 'center' }}>
        <Icon icon={BookOpenIcon} size={32} />
        <Text type={'secondary'}>{t('article.empty')}</Text>
      </Flexbox>
    );
  }

  const body = articleBodyMarkdown(article);

  return (
    <Flexbox className={styles.body} gap={20}>
      {article.cite && (
        <div className={styles.cite} dangerouslySetInnerHTML={{ __html: sanitizeCite(article.cite) }} />
      )}

      <Markdown variant={'chat'}>{body}</Markdown>

      <Flexbox gap={8}>
        <Flexbox horizontal align={'center'} justify={'space-between'}>
          <span className={styles.section}>{t('article.followups.title')}</span>
          <Button
            icon={<Icon icon={SparklesIcon} />}
            loading={generatingFollowups}
            size={'small'}
            type={'text'}
            onClick={generateFollowups}
          >
            {t('article.followups.generate')}
          </Button>
        </Flexbox>
        {followups.map((question) => (
          <Button
            className={styles.followup}
            disabled={asking}
            key={question}
            size={'small'}
            type={'default'}
            onClick={() => ask(question)}
          >
            {question}
          </Button>
        ))}
      </Flexbox>

      {qa.length > 0 && (
        <Flexbox gap={12}>
          <span className={styles.section}>{t('article.qa.title')}</span>
          {qa.map((entry, index) => (
            <Flexbox gap={6} key={`${index}-${entry.question}`}>
              <span className={styles.qaQuestion}>{entry.question}</span>
              <div className={styles.qaAnswer}>
                <Markdown variant={'chat'}>{entry.answer}</Markdown>
              </div>
            </Flexbox>
          ))}
        </Flexbox>
      )}

      {error && <Text type={'danger'}>{t(`article.error.${error}`)}</Text>}
    </Flexbox>
  );
});

/** The citation string is server-built HTML with only b/i/a tags; strip anything else. */
const sanitizeCite = (cite: string) =>
  cite
    .replaceAll(/<(?!\/?[bia]\b)[^>]*>/gi, '')
    .replaceAll(/\son\w+="[^"]*"/gi, '')
    .replaceAll(/javascript:/gi, '');

const QuestionInput = memo(() => {
  const { t } = useTranslation('qwksearch');
  const [value, setValue] = useState('');
  const [ask, asking, hasArticle] = useArticlePanelStore((s) => [s.ask, s.asking, !!s.article]);

  const submit = useCallback(async () => {
    const question = value.trim();
    if (!question) return;
    setValue('');
    await ask(question);
  }, [ask, value]);

  if (!hasArticle) return null;

  return (
    <Flexbox horizontal className={styles.question} gap={8}>
      <Input
        disabled={asking}
        placeholder={t('article.ask.placeholder')}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onPressEnter={submit}
      />
      <Button
        disabled={!value.trim()}
        icon={<Icon icon={SendIcon} />}
        loading={asking}
        type={'primary'}
        onClick={submit}
      >
        {t('article.ask.submit')}
      </Button>
    </Flexbox>
  );
});

const ArticleHeader = memo(() => {
  const { t } = useTranslation('qwksearch');
  const [article, url, isFavorite, favoriteLoading] = useArticlePanelStore((s) => [
    s.article,
    s.url,
    s.isFavorite,
    s.favoriteLoading,
  ]);
  const [closePanel, toggleFavorite] = useArticlePanelStore((s) => [s.closePanel, s.toggleFavorite]);
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async () => {
    if (!article) return;
    await navigator.clipboard.writeText(articleBodyMarkdown(article));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [article]);

  return (
    <Flexbox className={styles.header} gap={8}>
      <Flexbox horizontal align={'flex-start'} gap={8} justify={'space-between'}>
        <Flexbox flex={1} gap={4} style={{ minWidth: 0 }}>
          <span className={styles.title}>{article?.title || t('article.title')}</span>
          <Flexbox horizontal align={'center'} gap={6} wrap={'wrap'}>
            {article?.source && <Tag>{article.source}</Tag>}
            {article?.word_count ? (
              <Text style={{ fontSize: 12 }} type={'secondary'}>
                {t('article.wordCount', { count: article.word_count })}
              </Text>
            ) : null}
            {article?.via && (
              <Text style={{ fontSize: 12 }} type={'secondary'}>
                {t(`article.via.${article.via}`)}
              </Text>
            )}
          </Flexbox>
        </Flexbox>
        <Flexbox horizontal gap={2}>
          <ActionIcon
            active={isFavorite}
            disabled={!article}
            icon={StarIcon}
            loading={favoriteLoading}
            size={'small'}
            title={isFavorite ? t('article.actions.unfavorite') : t('article.actions.favorite')}
            onClick={toggleFavorite}
          />
          <ActionIcon
            disabled={!article}
            icon={copied ? CheckIcon : CopyIcon}
            size={'small'}
            title={copied ? t('article.actions.copied') : t('article.actions.copy')}
            onClick={copy}
          />
          <ActionIcon
            disabled={!url}
            icon={ExternalLinkIcon}
            size={'small'}
            title={t('article.actions.openOriginal')}
            onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
          />
          <ActionIcon
            icon={XIcon}
            size={'small'}
            title={t('article.actions.close')}
            onClick={closePanel}
          />
        </Flexbox>
      </Flexbox>
    </Flexbox>
  );
});

/**
 * Article extract side panel — QwkSearch's "read the source beside the chat"
 * feature on top of LobeHub. Mounted once in the main layout; opens whenever a
 * chat message link is clicked or `openArticlePanel()` is called.
 */
const ArticlePanel = memo(() => {
  useArticleLinkInterceptor();
  const [isOpen, width] = useArticlePanelStore((s) => [s.isOpen, s.width]);
  const [closePanel, setWidth] = useArticlePanelStore((s) => [s.closePanel, s.setWidth]);

  return (
    <DraggablePanel
      destroyOnClose
      expand={isOpen}
      minWidth={ARTICLE_PANEL_MIN_WIDTH}
      placement={'right'}
      showHandleWhenCollapsed={false}
      size={{ height: '100%', width }}
      onExpandChange={(expand) => {
        if (!expand) closePanel();
      }}
      onSizeChange={(_, size) => {
        if (size?.width) setWidth(Number.parseInt(String(size.width), 10));
      }}
    >
      <Flexbox className={styles.container}>
        <ArticleHeader />
        <ArticleBody />
        <QuestionInput />
      </Flexbox>
    </DraggablePanel>
  );
});

ArticlePanel.displayName = 'QwkSearchArticlePanel';

export default ArticlePanel;
