import React, { useState } from 'react';
import AddProvider from './AddProviderDialog';
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

  return (
    <div className="flex-1 space-y-6 overflow-y-auto py-6">
      <div className="flex flex-col px-6 gap-y-4">
        <h3 className="text-xs lg:text-xs text-black/70 dark:text-white/70">
          Select model
        </h3>
        <ModelSelect
          providers={values.filter((p) =>
            p.chatModels.some((m) => m.key != 'error'),
          )}
          type="chat"
        />
      </div>
      <div className="border-t border-light-200 dark:border-dark-200" />
      <ModelFamiliesCarousel modelProviders={fields} connectedProviders={providers} setProviders={setProviders} />
      <div className="border-t border-light-200 dark:border-dark-200" />
      <div className="flex flex-row justify-between items-center px-6 ">
        <p className="text-xs lg:text-xs text-black/70 dark:text-white/70">
          Manage connections
        </p>
        <AddProvider modelProviders={fields} setProviders={setProviders} />
      </div>
    </div>
  );
};

export default Models;
