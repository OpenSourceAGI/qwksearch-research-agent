/**
 * Entry point that mounts the alternatives demo React app into the page.
 */

import React from 'react'
import { createRoot } from 'react-dom/client'
import AlternativesApp from './AlternativesApp'
import './styles.css'

const root = createRoot(document.getElementById('root'))
root.render(<AlternativesApp />)
