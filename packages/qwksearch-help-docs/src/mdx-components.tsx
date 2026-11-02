/**
 * @file mdx-components.tsx
 * @description MDX component map for the help docs — the fumadocs defaults
 * plus the components pages are allowed to use without importing them.
 */
import { File, Files, Folder } from 'fumadocs-ui/components/files';
import { Step, Steps } from 'fumadocs-ui/components/steps';
import * as TabsComponents from 'fumadocs-ui/components/tabs';
import { Accordion, Accordions } from 'fumadocs-ui/components/accordion';
import { Callout } from 'fumadocs-ui/components/callout';
import { Card, Cards } from 'fumadocs-ui/components/card';
import { TypeTable } from 'fumadocs-ui/components/type-table';
import defaultComponents from 'fumadocs-ui/mdx';
import type { MDXComponents } from 'mdx/types';

import {
  FeatureCard,
  FeatureCards,
  Hero,
  HeroAction,
  Highlight,
  Highlights,
} from './components/home';

export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    ...defaultComponents,
    ...TabsComponents,
    Accordion,
    Accordions,
    Callout,
    Card,
    Cards,
    FeatureCard,
    FeatureCards,
    File,
    Files,
    Folder,
    Hero,
    HeroAction,
    Highlight,
    Highlights,
    Step,
    Steps,
    TypeTable,
    ...components,
  };
}
