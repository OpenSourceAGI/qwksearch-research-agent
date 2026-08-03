// Suppresses displayName errors on forwardRef components
// This is a known TypeScript limitation with React.forwardRef
// See: https://github.com/DefinitelyTyped/DefinitelyTyped/issues/34757

declare global {
  namespace React {
    interface ExoticComponent {
      /** Optional component name shown in React DevTools and warnings. */
      displayName?: string | undefined;
    }

    interface NamedExoticComponent {
      /** Optional component name shown in React DevTools and warnings. */
      displayName?: string | undefined;
    }

    interface ForwardRefExoticComponent<P> {
      /** Optional component name shown in React DevTools and warnings. */
      displayName?: string | undefined;
    }

    interface MemoExoticComponent<C> {
      /** Optional component name shown in React DevTools and warnings. */
      displayName?: string | undefined;
    }
  }
}

export {};
