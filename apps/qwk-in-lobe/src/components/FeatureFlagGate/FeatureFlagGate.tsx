'use client';

import { memo, type ReactElement, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useServerConfigStore } from '@/store/serverConfig';
import { featureFlagsSelectors } from '@/store/serverConfig/selectors';

interface FeatureFlagGateProps {
  flag: keyof ReturnType<typeof featureFlagsSelectors>;
  children: ReactElement;
  fallbackPath?: string;
}

const FeatureFlagGate = memo(({ flag, children, fallbackPath = '/' }: FeatureFlagGateProps) => {
  const isEnabled = useServerConfigStore((s) => featureFlagsSelectors(s)[flag]);
  const navigate = useNavigate();

  useEffect(() => {
    if (isEnabled === false) {
      navigate(fallbackPath, { replace: true });
    }
  }, [isEnabled, navigate, fallbackPath]);

  if (isEnabled === false) {
    return null;
  }

  return children;
});

FeatureFlagGate.displayName = 'FeatureFlagGate';

export default FeatureFlagGate;