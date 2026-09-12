/**
 * Worker replacement for `@/libs/i18n/serverTranslation`.
 *
 * The original resolves `locales/<lng>/<ns>.json` through a template-literal
 * dynamic import that the single-module Worker bundle cannot satisfy, so SEO
 * meta fell back to raw keys. The Worker only needs the two namespaces used by
 * the HTML shells (`metadata`, `auth`); they are bundled statically here in
 * the default language. Client-side i18n is unaffected (the SPA loads its own
 * locale bundles).
 */
import auth from '@/locales/default/auth';
import metadata from '@/locales/default/metadata';

type Dictionary = Record<string, string>;

const namespaces: Record<string, Dictionary> = {
  auth: auth as Dictionary,
  metadata: metadata as Dictionary,
};

export const getLocale = async (hl?: string): Promise<string> => hl || 'en-US';

export const translation = async (ns: string = 'common', hl: string) => {
  const dictionary = namespaces[ns] ?? {};

  return {
    locale: hl || 'en-US',
    t: (key: string, options: Record<string, string> = {}) => {
      let content = dictionary[key];
      if (!content) return key;
      for (const [k, value] of Object.entries(options)) {
        content = content.replaceAll(`{{${k}}}`, value);
      }
      return content;
    },
  };
};
