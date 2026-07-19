"use client";

import {
  ArrowLeft,
  BrainCog,
  ChevronLeft,
  Search,
  Server,
  UserCircle,
  HardDrive,
  Wand2,
} from 'lucide-react';
import Account from './Sections/Account';
import { useEffect, useState } from 'react';
import grab from 'grab-url';
import { toast } from 'sonner';
import Loader from '../ui/Loader';
import { cn } from '../../lib/utils';
import Models from './Sections/Models/Section';
import MCPServers from './Sections/MCPServers/Section';
import SearchSection from './Sections/Search';
import SearchEngines from './Sections/SearchEngines';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import Storage from './Sections/Storage';
import RewritePrompts from './Sections/RewritePrompts';
import FileSources from './Sections/FileSources';
import AIRewriteModes from './Sections/AIRewriteModes';

const sections = [
  {
    key: 'account',
    name: 'Account',
    description: 'Manage your profile, password, and linked accounts.',
    icon: UserCircle,
    component: Account,
    dataAdd: 'account',
  },
  {
    key: 'models',
    name: 'Language Models',
    description: 'Connect to AI services and manage connections.',
    icon: BrainCog,
    component: Models,
    dataAdd: 'modelProviders',
  },
  {
    key: 'mcpservers',
    name: 'Connectors',
    description: 'Configure Model Context Protocol servers.',
    icon: Server,
    component: MCPServers,
    dataAdd: 'mcpServers',
  },
  {
    key: 'searchEngines',
    name: 'Search Sources',
    description: 'Manage search engine sources by category.',
    icon: Search,
    component: SearchEngines,
    dataAdd: 'searchEngines',
  },
  {
    key: 'search',
    name: 'Search Settings',
    description: 'Configure search parameters.',
    icon: Search,
    component: SearchSection,
    dataAdd: 'search',
  },
  {
    key: 'fileSources',
    name: 'Cloud Storage',
    description: 'Manage storage sources (SSH, S3, R2, B2, Google Docs, Turso DB).',
    icon: HardDrive,
    component: FileSources,
    dataAdd: 'storage',
  },
  {
    key: 'aiRewriteModes',
    name: 'Rewrite Modes',
    description: 'Customize AI rewrite prompts and add your own modes.',
    icon: Wand2,
    component: AIRewriteModes,
    dataAdd: 'rewritePrompts',
  },
];

export { sections };

const SettingsContent = ({
  onClose,
  initialSection,
}: {
  onClose: () => void;
  initialSection?: string;
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [config, setConfig] = useState<any>(null);
  const initialKey = sections.find((s) => s.key === initialSection)?.key ?? sections[0].key;
  const [activeSection, setActiveSection] = useState<string>(initialKey);
  const [selectedSection, setSelectedSection] = useState(
    sections.find((s) => s.key === initialKey)!,
  );

  useEffect(() => {
    setSelectedSection(sections.find((s) => s.key === activeSection)!);
  }, [activeSection]);

  const fetchConfig = async () => {
    setIsLoading(true);
    try {
      const data = await grab('config');
      // grab resolves with the response body even on HTTP errors, so an
      // error payload ({ message }) would otherwise be stored as the config
      if (!data?.fields || !data?.values) {
        throw new Error(data?.message ?? 'Invalid configuration response.');
      }
      setConfig(data);
    } catch (error) {
      console.error('Error fetching config:', error);
      toast.error('Failed to load configuration.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full w-full">
        <Loader />
      </div>
    );
  }

  if (!config) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full space-y-3">
        <p className="text-sm text-black/70 dark:text-white/70">
          Failed to load settings.
        </p>
        <button
          onClick={fetchConfig}
          className="px-3 py-1.5 rounded-lg text-sm bg-light-200 dark:bg-dark-200 text-black/90 dark:text-white/90 hover:bg-light-300 hover:dark:bg-dark-300 transition duration-200 active:scale-95"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 inset-0 h-full overflow-hidden">
      <div className="hidden lg:flex flex-col w-[240px] border-r border-light-200 dark:border-dark-200 h-full px-3 pt-3 overflow-y-auto">
        <button
          onClick={onClose}
          className="group flex flex-row items-center hover:bg-light-200 hover:dark:bg-dark-200 p-2 rounded-lg"
        >
          <ChevronLeft
            size={18}
            className="text-black/50 dark:text-white/50 group-hover:text-black/70 group-hover:dark:text-white/70"
          />
          <p className="text-black/50 dark:text-white/50 group-hover:text-black/70 group-hover:dark:text-white/70 text-[14px]">
            Back
          </p>
        </button>
        <div className="flex flex-col items-start space-y-1 mt-8">
          {sections.map((section) => (
            <button
              key={section.dataAdd}
              className={cn(
                `flex flex-row items-center space-x-2 px-2 py-1.5 rounded-lg w-full text-sm hover:bg-light-200 hover:dark:bg-dark-200 transition duration-200 active:scale-95`,
                activeSection === section.key
                  ? 'bg-light-200 dark:bg-dark-200 text-black/90 dark:text-white/90'
                  : ' text-black/70 dark:text-white/70',
              )}
              onClick={() => setActiveSection(section.key)}
            >
              <section.icon size={17} />
              <p>{section.name}</p>
            </button>
          ))}
        </div>
      </div>
      <div className="w-full flex flex-col overflow-hidden">
        <div className="flex flex-row lg:hidden w-full justify-between px-[20px] my-4 flex-shrink-0">
          <button
            onClick={onClose}
            className="group flex flex-row items-center hover:bg-light-200 hover:dark:bg-dark-200 rounded-lg mr-[40%]"
          >
            <ArrowLeft
              size={18}
              className="text-black/50 dark:text-white/50 group-hover:text-black/70 group-hover:dark:text-white/70"
            />
          </button>
          <Select
            value={activeSection}
            onValueChange={(value) => setActiveSection(value)}
          >
            <SelectTrigger className="w-full bg-light-primary dark:bg-dark-primary border-light-200 dark:border-dark-200 text-black dark:text-white">
              <SelectValue placeholder="Select a section" />
            </SelectTrigger>
            <SelectContent className="bg-light-primary dark:bg-dark-primary border-light-200 dark:border-dark-200">
              {sections.map((section) => (
                <SelectItem
                  key={section.key}
                  value={section.key}
                  className="text-black dark:text-white focus:bg-light-200 dark:focus:bg-dark-200"
                >
                  {section.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {selectedSection.component && (
          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="border-b border-light-200/60 px-6 pb-6 lg:pt-6 dark:border-dark-200/60 flex-shrink-0">
              <div className="flex flex-col">
                <h4 className="font-medium text-black dark:text-white text-sm lg:text-sm">
                  {selectedSection.name}
                </h4>
                <p className="text-[11px] lg:text-xs text-black/50 dark:text-white/50">
                  {selectedSection.description}
                </p>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              <selectedSection.component
                fields={config?.fields?.[selectedSection.dataAdd]}
                values={config?.values?.[selectedSection.dataAdd]}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsContent;
