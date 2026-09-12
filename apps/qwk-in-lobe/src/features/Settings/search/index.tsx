'use client';

import { useTranslation } from 'react-i18next';

import SettingHeader from '@/features/Settings/features/SettingHeader';

import SearchForm from './features/SearchForm';

interface PageProps {
  showSettingHeader?: boolean;
}

const Page = ({ showSettingHeader = true }: PageProps) => {
  const { t } = useTranslation('qwksearch');

  return (
    <>
      {showSettingHeader && (
        <SettingHeader description={t('search.description')} title={t('search.title')} />
      )}
      <SearchForm />
    </>
  );
};

export default Page;
