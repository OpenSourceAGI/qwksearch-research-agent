'use client';

import { useEffect } from 'react';
import { ChatWindow } from 'research-agent-ui';
import { ReasonDocs } from 'react-reason-editor/reason-docs';
import { themeActions } from 'react-reason-editor/theme';
import { localeActions } from 'react-reason-editor/locale-bundle';
import { useMainView } from '@/components/layout/MainViewProvider';

import 'react-reason-editor/style.css';
import 'katex/dist/katex.min.css';
import 'easydrawer/styles.css';
import 'katex/contrib/mhchem';

export function MainWorkspaceView() {
  const { activeView } = useMainView();

  useEffect(() => {
    localeActions.setLang('en');
    themeActions.setColor('default');
  }, []);

  return activeView === 'docs' ? (
    <ReasonDocs />
  ) : (
    <ReasonDocs mainContent={<ChatWindow />} />
  );
}
