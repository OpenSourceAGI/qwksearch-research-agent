/**
 * React component that renders GoogleDrivePicker within the ResearchAgent area of ResearchAgent.
 */
'use client';

import { useEffect, useRef } from 'react';

// Type assertion helpers for Google APIs
const getGapi = () => window.gapi as GapiAPI | undefined;
const getGoogle = () => window.google as GoogleAPI | undefined;


export const useGooglePicker = () => {
  const pickerApiLoaded = useRef(false);
  const gapiLoaded = useRef(false);

  useEffect(() => {
    // Load the Google API client library
    const loadGapi = () => {
      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = () => {
        getGapi()?.load('client:picker', () => {
          gapiLoaded.current = true;
        });
      };
      document.body.appendChild(script);
    };

    // Load the Google Picker API
    const loadPicker = () => {
      const script = document.createElement('script');
      script.src = 'https://www.google.com/jsapi';
      script.onload = () => {
        pickerApiLoaded.current = true;
      };
      document.body.appendChild(script);
    };

    if (!getGapi()) {
      loadGapi();
    } else {
      gapiLoaded.current = true;
    }

    if (!getGoogle()?.picker) {
      loadPicker();
    } else {
      pickerApiLoaded.current = true;
    }
  }, []);

  const openPicker = async (
    accessToken: string,
    onFilesSelected: (files: google.picker.DocumentObject[]) => void,
    onError?: (error: string) => void
  ) => {
    const googleApi = getGoogle();
    if (!gapiLoaded.current || !googleApi?.picker) {
      onError?.('Google Picker API not loaded yet. Please try again.');
      return;
    }

    try {
      const { picker } = googleApi;
      const pickerInstance = new picker.PickerBuilder()
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
        .setDeveloperKey(process.env.NEXT_PUBLIC_GOOGLE_API_KEY || '')
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
