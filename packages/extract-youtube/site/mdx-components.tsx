import * as TabsComponents from 'fumadocs-ui/components/tabs';
import { Card, type CardProps } from 'fumadocs-ui/components/card';
import { File, Files, Folder } from 'fumadocs-ui/components/files';
import { Step, Steps } from 'fumadocs-ui/components/steps';
import defaultComponents from 'fumadocs-ui/mdx';
import type { MDXComponents } from 'mdx/types';
import type { AnchorHTMLAttributes } from 'react';

/**
 * Paths on this origin that are static files, not App Router routes: the
 * Storybook is served from `dist/client/storybook` by Workers Assets. A
 * client-side navigation there asks vinext for a route that does not exist and
 * goes nowhere, so links to it must be plain page loads.
 */
function isStaticPath(href: unknown): boolean {
  return typeof href === 'string' && href.startsWith('/storybook');
}

const DefaultLink = defaultComponents.a;

/** Components available in every MDX page without an import. */
export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    ...defaultComponents,
    ...TabsComponents,
    a: (props: AnchorHTMLAttributes<HTMLAnchorElement>) =>
      isStaticPath(props.href) || !DefaultLink ? <a {...props} /> : <DefaultLink {...props} />,
    Card: (props: CardProps) => <Card {...props} external={props.external ?? isStaticPath(props.href)} />,
    File,
    Folder,
    Files,
    Step,
    Steps,
    ...components,
  };
}
