/// <reference types="vite/client" />

declare module 'react-router-dom' {
  import React from 'react';
  export interface NavLinkProps {
    to: string | { pathname?: string; search?: string; hash?: string };
    end?: boolean;
    caseSensitive?: boolean;
    className?: string | ((props: { isActive: boolean; isPending: boolean }) => string | undefined);
    style?: React.CSSProperties | ((props: { isActive: boolean; isPending: boolean }) => React.CSSProperties | undefined);
    children?: React.ReactNode | ((props: { isActive: boolean; isPending: boolean }) => React.ReactNode);
    [key: string]: any;
  }
  export const NavLink: React.ForwardRefExoticComponent<NavLinkProps & React.RefAttributes<HTMLAnchorElement>>;
  export function useLocation(): { pathname: string; search: string; hash: string; state: unknown; key: string };
  export function useParams<T extends Record<string, string | undefined> = Record<string, string | undefined>>(): T;
}

declare module 'mermaid' {
  const mermaid: {
    initialize: (config: Record<string, any>) => void;
    render: (id: string, text: string) => Promise<{ svg: string }>;
    [key: string]: any;
  };
  export default mermaid;
}

declare module 'fuse.js' {
  interface FuseOptions<T> {
    keys?: (keyof T | string)[];
    threshold?: number;
    includeScore?: boolean;
    [key: string]: any;
  }
  interface FuseResultMatch {
    indices: [number, number][];
    key?: string;
    refIndex?: number;
    value?: string;
  }
  interface FuseResult<T> {
    item: T;
    refIndex: number;
    score?: number;
    matches?: FuseResultMatch[];
  }
  class Fuse<T> {
    constructor(list: T[], options?: FuseOptions<T>);
    search(pattern: string): FuseResult<T>[];
  }
  export default Fuse;
}

declare module '*.svg' {
  const content: string;
  export default content;
}

declare module '*.png' {
  const content: string;
  export default content;
}

declare module '*.jpg' {
  const content: string;
  export default content;
}

declare module '*.jpeg' {
  const content: string;
  export default content;
}

declare module '*.gif' {
  const content: string;
  export default content;
}

declare module '*.webp' {
  const content: string;
  export default content;
}
