import { useState } from 'react';
import openConnectorData from 'agent-toolkit/connectors/openconnector-providers-index.json';

type Connector = {
  name: string;
  connector_id: string | null;
  domain: string | null;
  description: string;
};

const connectors: Connector[] = (openConnectorData.connectors as Connector[]).filter(
  (c) => c.connector_id !== null,
);

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
  const handleLink = (connector: Connector) => {
    if (connector.domain) {
      window.open(
        `https://${connector.domain}`,
        '_blank',
        'noopener,noreferrer',
      );
    }
  };

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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {connectors.map((connector) => (
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
        ))}
      </div>
    </div>
  );
};

export default OpenConnectorConnectors;
