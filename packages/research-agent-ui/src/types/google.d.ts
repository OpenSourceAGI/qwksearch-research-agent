// Type definitions for Google Picker API
// Based on https://developers.google.com/picker/docs/reference

declare namespace google.picker {
  interface DocumentObject {
    /** Google Drive file or folder ID. */
    id: string;
    /** Display name shown in the picker. */
    name: string;
    /** MIME type for the selected item. */
    mimeType: string;
    /** Direct URL reference for the item. */
    url: string;
    /** Optional icon URL associated with the item type. */
    iconUrl?: string;
    /** Optional picker-provided description text. */
    description?: string;
    /** Optional embeddable URL for preview contexts. */
    embedUrl?: string;
    /** Optional last-edited time in UTC milliseconds. */
    lastEditedUtc?: number;
    /** Optional file size in bytes. */
    sizeBytes?: number;
    /** Optional parent folder ID. */
    parentId?: string;
    /** Optional service identifier from picker backend. */
    serviceId?: string;
    /** Optional generic item type value from picker. */
    type?: string;
  }

  enum Action {
    PICKED = 'picked',
    CANCEL = 'cancel',
    LOADED = 'loaded',
  }

  enum ViewId {
    DOCS = 'docs',
    DOCS_IMAGES = 'docs-images',
    DOCS_IMAGES_AND_VIDEOS = 'docs-images-and-videos',
    DOCS_VIDEOS = 'docs-videos',
    DOCUMENTS = 'documents',
    DRAWINGS = 'drawings',
    FOLDERS = 'folders',
    FORMS = 'forms',
    PDFS = 'pdfs',
    PHOTOS = 'photos',
    PRESENTATIONS = 'presentations',
    RECENTLY_PICKED = 'recently-picked',
    SPREADSHEETS = 'spreadsheets',
  }

  class DocsView {
    constructor(viewId?: ViewId);
    setIncludeFolders(include: boolean): DocsView;
    setMimeTypes(mimeTypes: string): DocsView;
    setMode(mode: string): DocsView;
    setOwnedByMe(ownedByMe: boolean): DocsView;
    setParent(parentId: string): DocsView;
    setQuery(query: string): DocsView;
    setSelectFolderEnabled(enabled: boolean): DocsView;
    setStarred(starred: boolean): DocsView;
  }

  class PickerBuilder {
    constructor();
    addView(view: DocsView | ViewId): PickerBuilder;
    addViewGroup(viewGroup: ViewGroup): PickerBuilder;
    disableFeature(feature: Feature): PickerBuilder;
    enableFeature(feature: Feature): PickerBuilder;
    hideTitleBar(): PickerBuilder;
    isRelayUrl(): boolean;
    setAppId(appId: string): PickerBuilder;
    setCallback(callback: (data: ResponseObject) => void): PickerBuilder;
    setDeveloperKey(key: string): PickerBuilder;
    setDocument(document: Document): PickerBuilder;
    setLocale(locale: string): PickerBuilder;
    setMaxItems(max: number): PickerBuilder;
    setOAuthToken(token: string): PickerBuilder;
    setOrigin(origin: string): PickerBuilder;
    setRelayUrl(url: string): PickerBuilder;
    setSelectableMimeTypes(mimeTypes: string): PickerBuilder;
    setSize(width: number, height: number): PickerBuilder;
    setTitle(title: string): PickerBuilder;
    toUri(): string;
    build(): Picker;
  }

  class Picker {
    isVisible(): boolean;
    setCallback(callback: (data: ResponseObject) => void): void;
    setRelayUrl(url: string): void;
    setVisible(visible: boolean): void;
    dispose(): void;
  }

  class ViewGroup {
    constructor(view: DocsView | ViewId);
    addLabel(label: string): ViewGroup;
    addView(view: DocsView | ViewId): ViewGroup;
    addViewGroup(viewGroup: ViewGroup): ViewGroup;
  }

  interface ResponseObject {
    /** Picker action that triggered this callback payload. */
    action: Action | string;
    /** Selected documents returned for PICKED actions. */
    docs?: DocumentObject[];
    /** Parent documents context for the selected items. */
    parents?: DocumentObject[];
    /** Internal view tokens returned by picker state. */
    viewToken?: string[];
  }

  enum Feature {
    MINE_ONLY = 'mineOnly',
    MULTISELECT_ENABLED = 'multiselectEnabled',
    NAV_HIDDEN = 'navHidden',
    SIMPLE_UPLOAD_ENABLED = 'simpleUploadEnabled',
    SUPPORT_DRIVES = 'supportDrives',
  }
}

// Interface for the Google Picker on window
interface GooglePickerAPI {
  /** Picker builder class constructor. */
  PickerBuilder: typeof google.picker.PickerBuilder;
  /** Docs view class constructor. */
  DocsView: typeof google.picker.DocsView;
  /** Enum of available picker view IDs. */
  ViewId: typeof google.picker.ViewId;
  /** Enum of picker callback action values. */
  Action: typeof google.picker.Action;
  /** Enum of toggleable picker feature flags. */
  Feature: typeof google.picker.Feature;
  /** View group class constructor. */
  ViewGroup: typeof google.picker.ViewGroup;
}

interface GoogleAPI {
  accounts: {
    id: {
      /** Initializes Google Identity Services config. */
      initialize: (config: any) => void;
      /** Triggers the one-tap or account prompt flow. */
      prompt: (callback?: (notification: any) => void) => void;
    };
  };
  /** Google Picker API namespace exposed on window.google. */
  picker: GooglePickerAPI;
}

interface GapiAPI {
  /** Loads a specific gapi module and invokes callback on ready. */
  load: (api: string, callback: () => void) => void;
  /** Optional gapi client namespace when loaded. */
  client?: any;
}

interface Window {
  /** Optional global gapi object. */
  gapi?: GapiAPI;
  /** Optional global google object with identity and picker APIs. */
  google?: GoogleAPI;
  /** App-level flag indicating picker script bootstrap state. */
  googleScriptInitialized?: boolean;
}
