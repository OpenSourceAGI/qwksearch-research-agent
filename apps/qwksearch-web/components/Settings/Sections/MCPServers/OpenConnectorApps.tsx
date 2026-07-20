import { useState } from 'react';
import openConnectorData from 'chat-agent-toolkit/connectors/openconnector-providers-index.json';

type OpenConnectorProvider = {
  service: string;
  displayName: string;
  categories: string[];
  authTypes: string[];
  homepageUrl: string | null;
  actionCount: number;
  actions: string[];
};

type Connector = {
  name: string;
  connector_id: string;
  domain: string | null;
  description: string;
  categories: string[];
};

const domainFromUrl = (url: string | null): string | null => {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
};

const providers = openConnectorData as OpenConnectorProvider[];

const connectors: Connector[] = (Array.isArray(providers) ? providers : []).map(
  (p) => {
    const categories = Array.isArray(p.categories) ? p.categories : [];
    const description =
      categories.length > 0
        ? `${categories.join(', ')} · ${p.actionCount} action${p.actionCount === 1 ? '' : 's'}`
        : `${p.actionCount} action${p.actionCount === 1 ? '' : 's'}`;
    return {
      name: p.displayName || p.service,
      connector_id: p.service,
      domain: domainFromUrl(p.homepageUrl),
      description,
      categories,
    };
  },
);

const connectorCategories = Array.from(
  new Set((Array.isArray(providers) ? providers : []).flatMap((c) => c.categories)),
).sort();

const ConnectorLogo = ({ connector }: { connector: Connector }) => {
  const [imgError, setImgError] = useState(false);

  if (!connector.domain || imgError) {
    return (
      <div className="w-8 h-8 rounded-md bg-blue-500/15 dark:bg-blue-500/15 flex items-center justify-center text-blue-600 dark:text-blue-400 font-semibold text-sm">
        {connector.name.charAt(0)}
      </div>
    );
  }

  return (
    <img
      src={`https://www.google.com/s2/favicons?domain=${connector.domain}&sz=64`}
      alt={connector.name}
      width={32}
      height={32}
      className="w-8 h-8 rounded-md object-contain"
      onError={() => setImgError(true)}
    />
  );
};

const OpenConnectorConnectors = () => {
  const [activeCategory, setActiveCategory] = useState<string>(connectorCategories[0] || 'All');

  const handleLink = (connector: Connector) => {
    if (connector.domain) {
      window.open(
        `https://${connector.domain}`,
        '_blank',
        'noopener,noreferrer',
      );
    }
  };

  const filteredConnectors = connectors.filter((connector) =>
    connector.categories.includes(activeCategory),
  );

  const categoryCount: Record<string, number> = {};
  connectorCategories.forEach((category) => {
    categoryCount[category] = connectors.filter((c) =>
      c.categories.includes(category),
    ).length;
  });

  return (
    <div className="flex flex-col gap-y-4 px-6 pb-6">
      <div className="flex flex-row justify-between items-center">
        <div className="flex flex-col gap-y-1">
          <p className="text-sm font-medium text-black dark:text-white">
            OpenConnector Apps
          </p>
          <p className="text-xs text-black/70 dark:text-white/70">
            Link third-party services via OpenConnector to give the agent OAuth-authenticated access
          </p>
        </div>
        <div className="w-6 h-6 rounded opacity-80 bg-blue-500/15 dark:bg-blue-500/15 flex items-center justify-center text-blue-600 dark:text-blue-400 text-lg">
          🔗
        </div>
      </div>

      <div className="border-t border-light-200 dark:border-dark-200" />

      <div className="flex flex-wrap gap-2">
        {connectorCategories.map((category) => (
          <button
            key={category}
            onClick={() => setActiveCategory(category)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeCategory === category
                ? 'bg-blue-500 dark:bg-blue-500 text-white shadow-sm'
                : 'border border-light-200 dark:border-dark-200 text-black/70 dark:text-white/70 bg-light-secondary/40 dark:bg-dark-secondary/40 hover:border-light-300 hover:dark:border-dark-300 hover:bg-light-200 hover:dark:bg-dark-200'
            }`}
          >
            <span>{category}</span>
            <span className="ml-2 text-[11px] font-normal opacity-75">
              ({categoryCount[category]})
            </span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredConnectors.length > 0 ? (
          filteredConnectors.map((connector) => (
            <div
              key={connector.connector_id}
              className="flex flex-col justify-between gap-y-3 p-3.5 rounded-lg border border-light-200 dark:border-dark-200 bg-light-primary dark:bg-dark-primary hover:border-light-300 hover:dark:border-dark-300 transition-colors"
            >
              <div className="flex flex-row items-start gap-x-2.5">
                <ConnectorLogo connector={connector} />
                <div className="flex flex-col gap-y-0.5 min-w-0">
                  <p className="text-[13px] font-medium text-black dark:text-white leading-tight">
                    {connector.name}
                  </p>
                  <p className="text-[11px] text-black/50 dark:text-white/50 leading-snug line-clamp-2">
                    {connector.description}
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleLink(connector)}
                className="w-full px-3 py-1.5 rounded-md text-[12px] font-medium border border-light-200 dark:border-dark-200 text-black/70 dark:text-white/70 bg-light-secondary/40 dark:bg-dark-secondary/40 hover:bg-blue-500 hover:dark:bg-blue-500 hover:text-white hover:dark:text-white hover:border-blue-500 hover:dark:border-blue-500 active:scale-95 transition duration-200"
              >
                Link
              </button>
            </div>
          ))
        ) : (
          <div className="col-span-full flex flex-col items-center justify-center py-8 text-center">
            <p className="text-sm text-black/50 dark:text-white/50">
              No connectors found in this category
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default OpenConnectorConnectors;
