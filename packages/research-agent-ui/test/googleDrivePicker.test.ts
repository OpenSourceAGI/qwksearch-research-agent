/**
 * @fileoverview Unit tests for `useGooglePicker`: the Google scripts load when
 * the picker is opened, not when the upload menu mounts.
 */
import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useGooglePicker } from '../src/components/FileUpload/GoogleDrivePicker';

const GOOGLE_SCRIPTS = ['https://apis.google.com/js/api.js', 'https://www.google.com/jsapi'];

function googleScripts(): HTMLScriptElement[] {
    return [...document.querySelectorAll('script')].filter((script) => GOOGLE_SCRIPTS.includes(script.src));
}

/** Stands in for the two scripts: "loading" one installs its global, then fires onload. */
function fakeGoogleScriptLoads(setVisible: () => void) {
    const appendChild = document.body.appendChild.bind(document.body);
    vi.spyOn(document.body, 'appendChild').mockImplementation(<T extends Node>(node: T): T => {
        appendChild(node);
        if (node instanceof HTMLScriptElement && GOOGLE_SCRIPTS.includes(node.src)) {
            if (node.src.includes('apis.google.com')) {
                window.gapi = { load: (_api: string, callback: () => void) => callback() };
            } else {
                const builder: any = {};
                for (const method of ['addView', 'setOAuthToken', 'setDeveloperKey', 'setAppId', 'setCallback']) {
                    builder[method] = () => builder;
                }
                builder.build = () => ({ setVisible });
                const DocsView = function (this: any) {
                    this.setIncludeFolders = () => this;
                    this.setMimeTypes = () => this;
                };
                window.google = {
                    picker: {
                        PickerBuilder: function () { return builder; },
                        DocsView,
                        ViewId: {},
                        Action: {},
                    },
                } as any;
            }
            queueMicrotask(() => node.onload?.(new Event('load')));
        }
        return node;
    });
}

afterEach(() => {
    googleScripts().forEach((script) => script.remove());
    delete window.gapi;
    delete window.google;
});

describe('useGooglePicker', () => {
    it('does not load the Google scripts when it mounts', () => {
        renderHook(() => useGooglePicker());

        expect(googleScripts()).toHaveLength(0);
    });

    it('loads the Google scripts on the first openPicker and then opens the picker', async () => {
        const setVisible = vi.fn();
        fakeGoogleScriptLoads(setVisible);
        const onError = vi.fn();
        const { result } = renderHook(() => useGooglePicker());

        await result.current.openPicker('token', vi.fn(), onError);

        expect(googleScripts().map((script) => script.src).sort()).toEqual([...GOOGLE_SCRIPTS].sort());
        expect(onError).not.toHaveBeenCalled();
        expect(setVisible).toHaveBeenCalledWith(true);
    });
});
