'use client';

import { memo } from 'react';
import { Outlet } from 'react-router';

import { NavPanelPortal } from '@/features/NavPanel';

import DocsSidebar from './DocsSidebar';

const DocsLayout = memo(() => (
  <>
    <NavPanelPortal navKey={'qwk-docs'}>
      <DocsSidebar />
    </NavPanelPortal>
    <Outlet />
  </>
));

DocsLayout.displayName = 'QwkSearchDocsLayout';

export default DocsLayout;
