import { type FC, type ReactNode } from 'react';

import SettingsHero from './SettingsHero';

interface SettingHeaderProps {
  description?: ReactNode;
  extra?: ReactNode;
  title: ReactNode;
}

const SettingHeader: FC<SettingHeaderProps> = ({ title, description, extra }) => {
  return (
    <div style={{ paddingTop: 12 }}>
      <SettingsHero description={description} extra={extra} title={title} />
    </div>
  );
};

export default SettingHeader;
