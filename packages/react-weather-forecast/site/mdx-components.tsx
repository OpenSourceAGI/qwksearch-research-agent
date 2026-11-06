import * as TabsComponents from 'fumadocs-ui/components/tabs';
import { Step, Steps } from 'fumadocs-ui/components/steps';
import defaultComponents from 'fumadocs-ui/mdx';
import type { MDXComponents } from 'mdx/types';
import { WeatherPreview } from '@/components/demo/WeatherPreview';

/** Components available in every MDX page without an import. */
export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    ...defaultComponents,
    ...TabsComponents,
    Step,
    Steps,
    WeatherPreview,
    ...components,
  };
}
