'use client';

import { memo } from 'react';
import { Outlet } from 'react-router';

import { NavPanelPortal } from '@/features/NavPanel';
import FeatureFlagGate from '@/components/FeatureFlagGate';
import DocsSidebar from './DocsSidebar';

const DocsLayoutInner = memo(() => (
  <>
    <NavPanelPortal navKey={'qwk-docs'}>
      <DocsSidebar />
    </NavPanelPortal>
    <Outlet />
  </>
));

const DocsLayout = memo(() => (
  <FeatureFlagGate flag="enableQwkSearch" fallbackPath="/" >
    <DocsLayoutInner />
  </FeatureFlagGate>
));

DocsLayout.displayName = 'QwkSearchDocsLayout';

export default DocsLayout;
