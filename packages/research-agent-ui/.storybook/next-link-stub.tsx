import React from 'react';

/**
 * Storybook stub for `next/link`.
 *
 * Stories render outside a Next.js app, so the real `next/link` (which reaches
 * for the App Router context) can error. This drop-in renders a plain anchor
 * with the same common props, which is all the presentational components need.
 */
type NextLinkProps = {
  href?: string | { pathname?: string };
  children?: React.ReactNode;
} & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'>;

const Link = React.forwardRef<HTMLAnchorElement, NextLinkProps>(
  ({ href, children, ...props }, ref) => {
    const resolved =
      typeof href === 'string' ? href : href?.pathname ?? '#';
    return (
      <a ref={ref} href={resolved} {...props}>
        {children}
      </a>
    );
  },
);

Link.displayName = 'NextLinkStub';

export default Link;
