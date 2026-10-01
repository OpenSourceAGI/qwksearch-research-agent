/**
 * @fileoverview Hook that lazily loads the Google Picker API and exposes a function to open it.
 *
 * `useGooglePicker` returns `openPicker`, which loads the Google API client and Picker scripts the
 * first time it is called, then lets the user select files from Google Drive using an OAuth access
 * token.
 */
'use client';

import { researchAgentUIConfig } from '../../config';

// Type assertion helpers for Google APIs
const getGapi = () => window.gapi as GapiAPI | undefined;
const getGoogle = () => window.google as GoogleAPI | undefined;

/**
 * The two Google scripts used to load when the upload menu *mounted* — and the
 * menu is part of the chat input, so every page view paid for two third-party
 * scripts (and whatever they pull in) that only the rare Drive import uses.
 * They now load on the first `openPicker` call; the promise is shared, and
 * dropped on failure so the next attempt retries.
 */
let pickerApis: Promise<void> | null = null;

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.body.appendChild(script);
  });
}

function loadPickerApis(): Promise<void> {
  if (getGapi() && getGoogle()?.picker) return Promise.resolve();
  if (!pickerApis) {
    // The Google API client library, then its picker module.
    const gapiReady = (getGapi() ? Promise.resolve() : loadScript('https://apis.google.com/js/api.js')).then(
      () => new Promise<void>((resolve) => getGapi()!.load('client:picker', () => resolve())),
    );
    // The Google Picker API.
    const pickerReady = getGoogle()?.picker ? Promise.resolve() : loadScript('https://www.google.com/jsapi');
    pickerApis = Promise.all([gapiReady, pickerReady]).then(() => undefined);
    pickerApis.catch(() => {
      pickerApis = null;
    });
  }
  return pickerApis;
}

export const useGooglePicker = () => {
  const openPicker = async (
    accessToken: string,
    onFilesSelected: (files: google.picker.DocumentObject[]) => void,
    onError?: (error: string) => void
  ) => {
    try {
      await loadPickerApis();
    } catch {
      onError?.('Google Picker API could not be loaded. Please try again.');
      return;
    }
    const googleApi = getGoogle();
    if (!googleApi?.picker) {
      onError?.('Google Picker API not loaded yet. Please try again.');
      return;
    }

    try {
      const { picker } = googleApi;
      const builder = new picker.PickerBuilder()
        .addView(picker.ViewId.DOCS)
        .addView(picker.ViewId.DOCS_IMAGES)
        .addView(picker.ViewId.DOCS_VIDEOS)
        .addView(
          new picker.DocsView()
            .setIncludeFolders(true)
            .setMimeTypes(
              'application/pdf,application/vnd.google-apps.document,application/vnd.google-apps.spreadsheet,text/plain,image/jpeg,image/png'
            )
        )
        .setOAuthToken(accessToken)
        .setDeveloperKey(researchAgentUIConfig.googleApiKey);

      // The Drive connector is authorized with the per-file `drive.file`
      // scope, so picking a file is what grants access to it — and Google
      // only issues that grant when the picker names the app asking for it.
      if (researchAgentUIConfig.googleAppId) {
        builder.setAppId(researchAgentUIConfig.googleAppId);
      }

      const pickerInstance = builder
        .setCallback((data: google.picker.ResponseObject) => {
          if (data.action === picker.Action.PICKED) {
            const files = data.docs;
            if (files) {
              onFilesSelected(files);
            }
          } else if (data.action === picker.Action.CANCEL) {
            // User cancelled the picker
            console.log('User cancelled picker');
          }
        })
        .build();

      pickerInstance.setVisible(true);
    } catch (error: any) {
      onError?.(error.message || 'Failed to open Google Picker');
    }
  };

  return { openPicker };
};

export default useGooglePicker;
