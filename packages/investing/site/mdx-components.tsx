import * as TabsComponents from 'fumadocs-ui/components/tabs';
import { Accordion, Accordions } from 'fumadocs-ui/components/accordion';
import { Callout } from 'fumadocs-ui/components/callout';
import { Card, Cards } from 'fumadocs-ui/components/card';
import { Step, Steps } from 'fumadocs-ui/components/steps';
import { TypeTable } from 'fumadocs-ui/components/type-table';
import defaultComponents from 'fumadocs-ui/mdx';
import type { MDXComponents } from 'mdx/types';
import { MarketUrlPlayground } from '@/components/playground/market-urls';
import { ModelMetricsPlayground } from '@/components/playground/model-metrics';
import { OrderMapperPlayground } from '@/components/playground/order-mapper';
import { RollingStatsPlayground } from '@/components/playground/rolling-stats';

/** Components available in every MDX page without an import. */
export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    ...defaultComponents,
    ...TabsComponents,
    Accordion,
    Accordions,
    Callout,
    Card,
    Cards,
    Step,
    Steps,
    TypeTable,
    OrderMapperPlayground,
    ModelMetricsPlayground,
    RollingStatsPlayground,
    MarketUrlPlayground,
    ...components,
  };
}
