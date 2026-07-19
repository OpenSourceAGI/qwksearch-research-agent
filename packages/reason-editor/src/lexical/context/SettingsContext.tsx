/**
 * @fileoverview Context for managing editor settings and synchronizing them with URL parameters.
 */


import type { SettingName } from './appSettings';
import type { JSX } from 'react';

import * as React from 'react';
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

import { DEFAULT_SETTINGS, INITIAL_SETTINGS } from './appSettings';

/**
 * Shape of the settings context.
 */
type SettingsContextShape = {
  /** Function to update a specific setting */
  setOption: (name: SettingName, value: boolean) => void;
  /** Current editor settings */
  settings: Record<SettingName, boolean>;
};

const Context: React.Context<SettingsContextShape> = createContext({
  setOption: (name: SettingName, value: boolean) => {
    return;
  },
  settings: INITIAL_SETTINGS,
});

/**
 * Context provider for editor settings.
 * @param {Object} props - Component props.
 * @param {ReactNode} props.children - Child components to be wrapped by the provider.
 * @returns {JSX.Element} The rendered context provider.
 */
export const SettingsContext = ({
  children,
}: {
  children: ReactNode;
}): JSX.Element => {
  const [settings, setSettings] = useState(INITIAL_SETTINGS);

  const setOption = useCallback((setting: SettingName, value: boolean) => {
    setSettings((options) => ({
      ...options,
      [setting]: value,
    }));
    setURLParam(setting, value);
  }, []);

  const contextValue = useMemo(() => {
    return { setOption, settings };
  }, [setOption, settings]);

  return <Context.Provider value={contextValue}>{children}</Context.Provider>;
};

/**
 * Hook to access the editor settings context.
 * @returns {SettingsContextShape} The current settings and the function to update them.
 */
export const useSettings = (): SettingsContextShape => {
  return useContext(Context);
};

/**
 * Updates a URL parameter with the value of a setting.
 * @param {SettingName} param - The name of the setting.
 * @param {null | boolean} value - The value to set in the URL.
 */
function setURLParam(param: SettingName, value: null | boolean) {
  if (typeof window === 'undefined') return;

  const url = new URL(window.location.href);
  const params = new URLSearchParams(url.search);
  if (value !== DEFAULT_SETTINGS[param]) {
    params.set(param, String(value));
  } else {
    params.delete(param);
  }
  url.search = params.toString();
  window.history.pushState(null, '', url.toString());
}
