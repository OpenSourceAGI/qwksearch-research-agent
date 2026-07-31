/**
 * React entry point that mounts the example editor-with-toolbar app into the page. Bootstraps the standalone editor demo build.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';

import './global.css';

import EditorWithToolbar from './Editor-with-toolbar';

ReactDOM.createRoot(document.querySelector('#root') as HTMLElement).render(<EditorWithToolbar />);
