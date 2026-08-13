/**
 * Demo tab that renders the full document-organizer editor experience. Showcases the complete app with its sidebar and multiple documents.
 */

import ReasonDocs from '../../../src/editor/ReasonDocs'
import '../../../src/app-styles/split-pane.css'

export function TabFull() {
  return (
    <div className="flex-1 overflow-hidden">
      <ReasonDocs />
    </div>
  )
}
