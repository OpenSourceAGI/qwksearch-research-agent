import React, { useState } from 'react';
import { Eye } from 'lucide-react';
import AddProvider from './AddProviderDialog';
import ConnectedModelsModal from './ConnectedModelsModal';
import {
  ConfigModelProvider,
  ModelProviderUISection,
  UIConfigField,
} from '../../../../lib/config/types';
import ModelProvider from './ModelProvider';
import ModelSelect from './ModelSelect';
import ModelFamiliesCarousel from './ModelFamiliesCarousel';

const Models = ({
  fields,
  values,
}: {
  fields: ModelProviderUISection[];
  values: ConfigModelProvider[];
}) => {
  const [providers, setProviders] = useState<ConfigModelProvider[]>(values);
  const [showModelsModal, setShowModelsModal] = useState(false);

  return (
    <div className="flex-1 space-y-6 overflow-y-auto py-6">
      <div className="flex flex-col px-6 gap-y-4">
        <div className="flex flex-row justify-between items-center">
          <h3 className="text-xs lg:text-xs text-black/70 dark:text-white/70">
            All configured models
          </h3>
          <button
            onClick={() => setShowModelsModal(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-sky-500 text-white hover:opacity-85 active:scale-95 transition duration-200 flex items-center gap-2"
          >
            <Eye size={14} />
            View All
          </button>
        </div>
      </div>

      <ConnectedModelsModal
        open={showModelsModal}
        onOpenChange={setShowModelsModal}
        providers={providers}
        onAddConnection={() => {
          setShowModelsModal(false);
        }}
      />

      <div className="border-t border-light-200 dark:border-dark-200" />
      {/* <div className="flex flex-col px-6 gap-y-4">
        <h3 className="text-xs lg:text-xs text-black/70 dark:text-white/70">
          Select model
        </h3>
        <ModelSelect
          providers={values.filter((p) =>
            p.chatModels.some((m) => m.key != 'error'),
          )}
          type="chat"
        />
      </div> */}
      <div className="flex flex-row justify-between items-center px-6 ">
        <AddProvider modelProviders={fields} setProviders={setProviders} />
      </div>
      <div className="border-t border-light-200 dark:border-dark-200" />
      <ModelFamiliesCarousel modelProviders={fields} connectedProviders={providers} setProviders={setProviders} />
      <div className="border-t border-light-200 dark:border-dark-200" />
    </div>
  );
};

export default Models;
