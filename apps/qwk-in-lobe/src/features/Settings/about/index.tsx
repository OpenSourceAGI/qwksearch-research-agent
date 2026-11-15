import { useTranslation } from 'react-i18next';

import SettingHeader from '@/features/Settings/features/SettingHeader';

import Analytics from './features/Analytics';

interface PageProps {
  mobile?: boolean;
  showSettingHeader?: boolean;
}

const Page = ({ showSettingHeader = true }: PageProps) => {
  const { t } = useTranslation('setting');
  return (
    <>
      {showSettingHeader && <SettingHeader title={t('tab.about')} />}
      <Analytics />
    </>
  );
};

export default Page;
