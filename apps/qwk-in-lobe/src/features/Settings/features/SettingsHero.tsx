'use client';

import { Flexbox } from '@lobehub/ui';
import { createStaticStyles } from 'antd-style';
import { type ReactNode } from 'react';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

const styles = createStaticStyles(({ css, cssVar }) => ({
  accent: css`
    width: 48px;
    height: 4px;
    border-radius: 999px;
    background: linear-gradient(90deg, ${cssVar.colorPrimary}, ${cssVar.colorWarning});
  `,
  desc: css`
    max-width: 640px;
    font-size: 15px;
    line-height: 1.6;
    color: ${cssVar.colorTextSecondary};
  `,
  eyebrow: css`
    font-size: 11px;
    font-weight: 700;
    color: ${cssVar.colorPrimary};
    text-transform: uppercase;
    letter-spacing: 0.12em;
  `,
  title: css`
    margin: 0;

    font-size: 30px;
    font-weight: 750;
    line-height: 1.2;
    color: ${cssVar.colorText};
    letter-spacing: -0.02em;
  `,
}));

interface SettingsHeroProps {
  description?: ReactNode;
  extra?: ReactNode;
  /** Settings tab key; looks up `qwksearch:settingsHero.desc.<tab>` when no description is given. */
  tab?: string;
  title: ReactNode;
}

/**
 * The QwkSearch settings page header: a small brand eyebrow, a large title, a
 * one-line description of what the page is for, and a short accent bar.
 */
const SettingsHero = memo<SettingsHeroProps>(({ title, description, extra, tab }) => {
  const { t } = useTranslation('qwksearch');
  const descKey = tab ? `settingsHero.desc.${tab}` : undefined;
  const fallbackDesc = descKey ? t(descKey as any, { defaultValue: '' }) : '';
  const desc = description ?? (fallbackDesc || undefined);

  return (
    <Flexbox horizontal align={'flex-end'} gap={16} justify={'space-between'}>
      <Flexbox gap={10}>
        <span className={styles.eyebrow}>{t('settingsHero.eyebrow')}</span>
        <h1 className={styles.title}>{title}</h1>
        {desc && <div className={styles.desc}>{desc}</div>}
        <div className={styles.accent} />
      </Flexbox>
      {extra}
    </Flexbox>
  );
});

SettingsHero.displayName = 'SettingsHero';

export default SettingsHero;
