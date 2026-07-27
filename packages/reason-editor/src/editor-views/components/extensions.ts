/**
 * Backward-compatible default extension list for the example editor. The set of
 * extensions is now derived from the JSON editor config (see
 * `../config/editorConfig`) so the same list can be toggled at runtime from the
 * Settings modal. This module simply exposes the default (out-of-the-box)
 * configuration's extensions for consumers that want a static array.
 */

import { buildExtensions, createDefaultConfig } from '../config/editorConfig';

export const extensions = buildExtensions(createDefaultConfig());
