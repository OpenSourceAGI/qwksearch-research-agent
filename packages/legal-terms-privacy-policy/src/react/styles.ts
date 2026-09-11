/**
 * The legal page's stylesheet, carried as text rather than a `.css` file so the
 * package works in any bundler: a published package that `import`s CSS forces
 * every consumer to configure CSS handling for node_modules, and Next.js, Vite
 * and the extension builds all handle it differently. The component renders
 * this into a <style> element instead.
 *
 * Class names are prefixed with `legal-terms-` so a host page's own styles
 * cannot collide with them.
 */
export const legalTermsStyles = `
@import url('https://fonts.googleapis.com/css2?family=Lato:wght@400;700&display=swap');

.legal-terms-page {
    font-family: 'Lato', Arial, sans-serif;
    line-height: 1.6;
    margin: 0 auto;
    max-width: 800px;
    padding: 20px;
    color: #333;
    overflow-y: auto !important;
    height: 100%;
    padding-bottom: 50px;
    margin-bottom: 50px;
}

.legal-terms-page h1 {
    margin: 1rem 0;
    font-size: 2rem;
    color: #2c3e50;
    font-variant: small-caps;
}

.legal-terms-page h2 {
    margin: 1.5rem 0 1rem 0;
    font-size: 1.5rem;
    color: #34495e;
    font-variant: small-caps;
}

.legal-terms-page h3 {
    margin: 1rem 0;
    font-size: 1.2rem;
    color: #7f8c8d;
    font-variant: small-caps;
}

.legal-terms-page p {
    margin: 1rem 0;
}

.legal-terms-page ol,
.legal-terms-page ul {
    padding-left: 20px;
    margin: 1rem 0;
}

.legal-terms-page ol {
    list-style-type: decimal;
}

.legal-terms-page ol ol {
    list-style-type: lower-alpha;
}

.legal-terms-page ul {
    list-style-type: disc;
}

.legal-terms-page a {
    color: #2c5aa0;
}

.legal-terms-header {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 2rem;
    padding-top: 1rem;
}

.legal-terms-back,
.legal-terms-switch {
    display: inline-flex;
    align-items: center;
    padding: 0.5rem 1rem;
    background-color: #f8f9fa;
    color: #495057;
    text-decoration: none;
    border: 1px solid #dee2e6;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    font-weight: 500;
    font-family: inherit;
    transition: all 0.2s ease-in-out;
}

.legal-terms-switch {
    cursor: pointer;
}

.legal-terms-back:hover,
.legal-terms-switch:hover {
    background-color: #e9ecef;
    border-color: #adb5bd;
    color: #212529;
    text-decoration: none;
}

.legal-terms-summary-note {
    font-size: 0.9375rem;
    color: #6c757d;
}
`;
