/**
 * @module AboutSection
 * @description Settings panel showing application name and version info.
 * Rendered as one tab inside the Settings dialog.
 */
import { Separator } from '../../../app-ui/separator';

export const AboutSection = () => (
  <div className="space-y-6">
    <div>
      <h2 className="text-xl font-semibold mb-2">About</h2>
      <p className="text-sm text-muted-foreground">Application information</p>
    </div>

    <Separator />

    <div className="text-sm space-y-3">
      <div className="space-y-1">
        <p className="font-medium">REASON</p>
        <p className="text-muted-foreground">A powerful note-taking application</p>
      </div>
      <div className="space-y-1">
        <p className="font-medium">Version</p>
        <p className="text-muted-foreground">1.0.0</p>
      </div>
    </div>
  </div>
);
