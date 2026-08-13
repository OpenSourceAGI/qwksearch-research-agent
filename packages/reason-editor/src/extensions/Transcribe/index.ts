/**
 * Entry point for the Transcribe extension that re-exports the extension, its React
 * components and the centred phrase overlay. Lets the app import dictation from a
 * single, stable module path.
 */

export * from './Transcribe';
export * from './components/RichTextTranscribe';
export * from './components/TranscribeOverlay';
export * from './hooks/useTranscribeState';
