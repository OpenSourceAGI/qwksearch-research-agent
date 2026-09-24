/**
 * The consent banner's stylesheet, carried as text for the same reason as
 * {@link legalTermsStyles}: a published package that `import`s a `.css` file
 * forces every consumer to configure CSS handling for node_modules.
 *
 * Colors are read from the host's shadcn/ui custom properties where they are
 * defined, so the banner picks up the site's palette and its light/dark
 * switch for free. The fallbacks after each `var()` are what a site without
 * those properties gets — a plain light card, darkened by the media query
 * below when the visitor's system asks for it.
 *
 * Class names are prefixed with `legal-cookie-consent` so a host page's own
 * styles cannot collide with them.
 */
export const cookieConsentStyles = `
.legal-cookie-consent {
    position: fixed;
    right: 0;
    bottom: 0;
    z-index: 50;
    margin: 1rem;
    max-width: 24rem;
    font-family: inherit;
}

.legal-cookie-consent-card {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 1rem;
    border: 1px solid var(--border, #dee2e6);
    border-radius: 0.5rem;
    background-color: var(--secondary, #ffffff);
    color: var(--foreground, #212529);
    box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
}

.legal-cookie-consent-body {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.75rem;
}

.legal-cookie-consent-title {
    margin: 0 0 0.5rem 0;
    font-size: 0.875rem;
    font-weight: 600;
    line-height: 1.25rem;
}

.legal-cookie-consent-text {
    margin: 0 0 0.75rem 0;
    font-size: 0.75rem;
    line-height: 1.125rem;
    opacity: 0.7;
}

.legal-cookie-consent-links {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    font-size: 0.75rem;
}

.legal-cookie-consent-links a {
    color: #2563eb;
    text-decoration: none;
}

.legal-cookie-consent-links a:hover {
    text-decoration: underline;
}

.legal-cookie-consent-close {
    flex: none;
    padding: 0;
    border: 0;
    background: none;
    color: inherit;
    opacity: 0.5;
    cursor: pointer;
    transition: opacity 0.2s ease-in-out;
}

.legal-cookie-consent-close:hover {
    opacity: 1;
}

.legal-cookie-consent-close svg {
    width: 1rem;
    height: 1rem;
    display: block;
}

.legal-cookie-consent-actions {
    display: flex;
    gap: 0.5rem;
}

.legal-cookie-consent-actions button {
    flex: 1 1 0;
    padding: 0.375rem 0.75rem;
    border-radius: 0.375rem;
    border: 1px solid transparent;
    font-family: inherit;
    font-size: 0.875rem;
    font-weight: 500;
    line-height: 1.25rem;
    cursor: pointer;
    transition: background-color 0.2s ease-in-out, border-color 0.2s ease-in-out;
}

.legal-cookie-consent-accept {
    background-color: #2563eb;
    color: #ffffff;
}

.legal-cookie-consent-accept:hover {
    background-color: #1d4ed8;
}

.legal-cookie-consent-reject {
    background-color: transparent;
    border-color: var(--border, #dee2e6);
    color: inherit;
}

.legal-cookie-consent-reject:hover {
    background-color: var(--muted, #e9ecef);
}

/* Sites that define the custom properties above already switch with their own
   theme toggle; these two rules only cover the ones that do not. */
@media (prefers-color-scheme: dark) {
    .legal-cookie-consent-card {
        border-color: var(--border, rgb(255 255 255 / 0.1));
        background-color: var(--secondary, #1f2937);
        color: var(--foreground, #f9fafb);
    }

    .legal-cookie-consent-links a {
        color: #60a5fa;
    }

    .legal-cookie-consent-reject:hover {
        background-color: var(--muted, rgb(255 255 255 / 0.1));
    }
}
`;
