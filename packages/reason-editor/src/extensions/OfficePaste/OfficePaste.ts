/**
 * Defines the OfficePaste Tiptap extension, which adds cleaning content pasted from Microsoft Office to the editor. It sets up the extension's schema, commands, and default options so the feature integrates with the editor.
 */

import OfficePasteExtension from '@intevation/tiptap-extension-office-paste';

export interface OfficePasteOptions {
  enabled: boolean;
}

export const OfficePaste = OfficePasteExtension.configure({
  enabled: true,
});
