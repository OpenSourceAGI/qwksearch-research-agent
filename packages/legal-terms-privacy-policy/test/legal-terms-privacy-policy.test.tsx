import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LegalTermsPrivacyPolicy } from '../src/react';
import { LEGAL_SUMMARY_URL } from '../src/index';

const props = {
    appName: 'QwkSearch',
    contactEmail: 'support@qwksearch.com',
    lastRevisedDate: '2026-01-15',
    homeUrl: '/',
};

describe('LegalTermsPrivacyPolicy', () => {
    it('opens on the full legal text, titled and dated for the app', () => {
        render(<LegalTermsPrivacyPolicy {...props} />);

        expect(
            screen.getByRole('heading', {
                level: 1,
                name: 'QwkSearch Terms of Service and Privacy Policy',
            }),
        ).toBeTruthy();
        expect(screen.getByText('Revised Date: 2026-01-15')).toBeTruthy();
        expect(screen.getByRole('heading', { level: 2, name: '1. Introduction' })).toBeTruthy();
        expect(screen.getByRole('heading', { level: 2, name: '14. California Residents' })).toBeTruthy();
    });

    it('weaves the app name and contact address through the clauses', () => {
        render(<LegalTermsPrivacyPolicy {...props} />);

        expect(screen.getAllByText(/QwkSearch/).length).toBeGreaterThan(1);
        expect(screen.getAllByText(/support@qwksearch\.com/).length).toBeGreaterThan(1);
    });

    it('switches to the plain-language summary and back', () => {
        render(<LegalTermsPrivacyPolicy {...props} />);

        fireEvent.click(screen.getByRole('button', { name: /plain-language summary/i }));

        expect(screen.queryByRole('heading', { level: 2, name: '1. Introduction' })).toBeNull();
        expect(screen.getByRole('heading', { level: 2, name: 'What we collect' })).toBeTruthy();
        expect(screen.getByRole('link', { name: /rights\.institute\/terms-privacy/ }).getAttribute('href')).toBe(
            LEGAL_SUMMARY_URL,
        );

        fireEvent.click(screen.getByRole('button', { name: /full legal text/i }));

        expect(screen.getByRole('heading', { level: 2, name: '1. Introduction' })).toBeTruthy();
    });

    it('can open on the summary instead', () => {
        render(<LegalTermsPrivacyPolicy {...props} defaultVariant="summary" />);

        expect(screen.getByRole('heading', { level: 2, name: 'The agreement' })).toBeTruthy();
        expect(screen.getByRole('button', { name: /full legal text/i })).toBeTruthy();
    });

    it('leaves the home link out when no homeUrl is given', () => {
        const { homeUrl: _omitted, ...withoutHome } = props;
        render(<LegalTermsPrivacyPolicy {...withoutHome} />);

        expect(screen.queryByRole('link', { name: 'Back to Home' })).toBeNull();
    });
});
