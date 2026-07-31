/**
 * Defines the string constants for the editor's custom DOM and bus events. Centralizes event names so emitters and listeners stay in sync.
 */

export const EVENTS = {
  UPLOAD_IMAGE: (id: any) => `UPLOAD_IMAGE-${id}`,
  UPLOAD_VIDEO: (id: string) => `UPLOAD_VIDEO-${id}`,
  DRAWIO: (id: string) => `DRAWIO-${id}`,
} as const;

// type EventsType = typeof EVENTS;
export type EventValues = any;
