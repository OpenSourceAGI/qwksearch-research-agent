/**
 * Tables rendered straight from the package's own model registry, so the docs
 * list exactly the providers and models the published code knows about.
 */
import {
  LANGUAGE_MODELS,
  LANGUAGE_PROVIDERS,
  getModelsByProvider,
} from '../../src/language-model-registry';

const numberFormat = new Intl.NumberFormat('en-US');

/** One row per provider: its `provider` key, default model, model count and links. */
export function ProviderTable() {
  return (
    <table>
      <thead>
        <tr>
          <th>Provider</th>
          <th>Value</th>
          <th>Default model</th>
          <th>Models</th>
          <th>Links</th>
        </tr>
      </thead>
      <tbody>
        {LANGUAGE_MODELS.map((p, i) => (
          <tr key={p.provider}>
            <td>{p.provider}</td>
            <td>
              <code>{LANGUAGE_PROVIDERS[i]}</code>
            </td>
            <td>{'default' in p && p.default ? <code>{p.default}</code> : '—'}</td>
            <td>{p.models.length}</td>
            <td>
              <a href={p.docs}>Docs</a> · <a href={p.api_key}>Keys</a>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Every model a provider registers, with inferred capabilities and context length. */
export function ModelTable({ provider }: { provider: string }) {
  const models = getModelsByProvider(provider);
  if (models.length === 0) return <p>No models registered for {provider}.</p>;

  return (
    <table>
      <thead>
        <tr>
          <th>Model</th>
          <th>ID</th>
          <th>Context</th>
          <th>Capabilities</th>
        </tr>
      </thead>
      <tbody>
        {models.map((m, i) => (
          <tr key={`${m.id}-${i}`}>
            <td>{m.name}</td>
            <td>
              <code>{m.id}</code>
            </td>
            <td>{m.contextLength ? numberFormat.format(m.contextLength) : '—'}</td>
            <td>{m.capabilities?.join(', ')}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** A `ModelTable` per provider, each under its own heading. */
export function AllModelTables() {
  return (
    <>
      {LANGUAGE_MODELS.map((p) => (
        <section key={p.provider}>
          <h3 id={`models-${p.provider.toLowerCase()}`}>{p.provider}</h3>
          <ModelTable provider={p.provider} />
        </section>
      ))}
    </>
  );
}

/** Total number of registered models, for inline use in prose. */
export function ModelCount() {
  return <>{LANGUAGE_MODELS.reduce((n, p) => n + p.models.length, 0)}</>;
}
