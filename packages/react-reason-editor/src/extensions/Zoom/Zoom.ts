/**
 * Public surface of the Zoom extension, which scales the editor content. Unlike
 * most extensions this one has no Tiptap extension of its own — zooming is a DOM
 * transform driven from the toolbar — so this module only re-exports the React
 * control and the zoom helpers. It exists as a top-level module because the
 * library build derives one entry per `src/extensions/<Name>/<Name>.ts`.
 */

export * from './components/RichTextZoom';
