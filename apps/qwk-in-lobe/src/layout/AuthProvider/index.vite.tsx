import { isDesktop } from '@lobechat/const';
import { type PropsWithChildren } from 'react';

import Desktop from './Desktop';
import LocalUser from './LocalUser';

const AuthProvider = ({ children }: PropsWithChildren) => {
  if (isDesktop) return <Desktop>{children}</Desktop>;

  return <LocalUser>{children}</LocalUser>;
};

export default AuthProvider;
