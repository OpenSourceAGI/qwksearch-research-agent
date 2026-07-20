'use client';

import { VoiceSettingsPanel } from 'research-agent-ui';

const VoiceSection = () => {
  return (
    <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
      <VoiceSettingsPanel />
    </div>
  );
};

export default VoiceSection;
