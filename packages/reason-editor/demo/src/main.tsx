/**
 * Entry point that mounts the demo React app into the page. Bootstraps the demo build.
 */

import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'

const root = createRoot(document.getElementById('root'))
root.render(<App />)
