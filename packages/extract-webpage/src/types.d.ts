import { Model } from "./models/types";

type BaseUIConfigField = {
  name: string;
  key: string;
  required: boolean;
  description: string;
  scope: "client" | "server";
  env?: string;
};

type StringUIConfigField = BaseUIConfigField & {
  type: "string";
  placeholder?: string;
  default?: string;
};

type SelectUIConfigFieldOptions = {
  name: string;
  value: string;
};

type SelectUIConfigField = BaseUIConfigField & {
  type: "select";
  default?: string;
  options: SelectUIConfigFieldOptions[];
};

type PasswordUIConfigField = BaseUIConfigField & {
  type: "password";
  placeholder?: string;
  default?: string;
};

type TextareaUIConfigField = BaseUIConfigField & {
  type: "textarea";
  placeholder?: string;
  default?: string;
};

type SwitchUIConfigField = BaseUIConfigField & {
  type: "switch";
  default?: boolean;
};

type UIConfigField =
  | StringUIConfigField
  | SelectUIConfigField
  | PasswordUIConfigField
  | TextareaUIConfigField
  | SwitchUIConfigField;

type ConfigModelProvider = {
  id: string;
  name: string;
  type: string;
  chatModels: Model[];
  config: { [key: string]: any };
  hash: string;
  isEnvBased?: boolean; // True if provider was created from environment variables (global keys)
};

type MCPServerConfig = {
  id: string;
  name: string;
  type: string;
  url?: string;
  apiKey?: string;
  config: { [key: string]: any };
  enabled: boolean;
  hash: string;
};

type Config = {
  version: number;
  setupComplete: boolean;
  preferences: {
    [key: string]: any;
  };
  personalization: {
    [key: string]: any;
  };
  modelProviders: ConfigModelProvider[];
  mcpServers: MCPServerConfig[];
  search: {
    [key: string]: any;
  };
};

type EnvMap = {
  [key: string]: {
    fieldKey: string;
    providerKey: string;
  };
};

type ModelProviderUISection = {
  name: string;
  key: string;
  fields: UIConfigField[];
};

type MCPServerUISection = {
  name: string;
  key: string;
  fields: UIConfigField[];
};

type UIConfigSections = {
  preferences: UIConfigField[];
  personalization: UIConfigField[];
  modelProviders: ModelProviderUISection[];
  mcpServers: MCPServerUISection[];
  search: UIConfigField[];
};

export type {
  UIConfigField,
  Config,
  EnvMap,
  UIConfigSections,
  SelectUIConfigField,
  StringUIConfigField,
  ModelProviderUISection,
  MCPServerUISection,
  ConfigModelProvider,
  MCPServerConfig,
  TextareaUIConfigField,
  SwitchUIConfigField,
};
