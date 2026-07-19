/**
 * @module GoogleDocsIntegration
 * @description UI panel for two-way Google Docs synchronisation. Handles OAuth
 * token management, export, import, shareable-link generation, and per-user
 * sharing via the backend `googleDocsApi` client.
 */
import { useState } from 'react';
import { googleDocsApi } from '../lib/integrations/api-client';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Label } from '../ui/label';
import { Share2, Download, Upload, Link2, Mail } from 'lucide-react';
import { useToast } from '../hooks/use-toast';

/** Props for the {@link GoogleDocsIntegration} component. */
interface GoogleDocsIntegrationProps {
  /** ID of the document being synced with Google Docs. */
  documentId: string;
  /** Human-readable document title displayed in export notifications. */
  documentTitle: string;
}

/**
 * Integration panel that lets users connect a document to Google Docs.
 * Auth tokens are stored locally in component state; in production these
 * should be managed server-side via a secure OAuth flow.
 */
export const GoogleDocsIntegration = ({ documentId, documentTitle }: GoogleDocsIntegrationProps) => {
  const { toast } = useToast();
  const [accessToken, setAccessToken] = useState('');
  const [refreshToken, setRefreshToken] = useState('');
  const [googleDocId, setGoogleDocId] = useState('');
  const [shareEmail, setShareEmail] = useState('');
  const [shareRole, setShareRole] = useState<'reader' | 'writer' | 'commenter'>('reader');
  const [importDocId, setImportDocId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false);
  const [shareableLink, setShareableLink] = useState('');

  // Check if user is authenticated
  const isAuthenticated = !!accessToken;

  /**
   * Initiates the Google OAuth flow by fetching the auth URL from the backend
   * and opening it in a popup window. Shows an informational toast prompting
   * the user to paste their tokens after authorization.
   */
  const handleAuth = async () => {
    try {
      setIsLoading(true);
      const authUrl = await googleDocsApi.getAuthUrl();

      // Open auth URL in popup
      const popup = window.open(authUrl, 'Google Auth', 'width=600,height=700');

      // Listen for callback (in production, handle this properly)
      toast({
        title: 'Authorization Required',
        description: 'Please authorize in the popup window, then paste your tokens below.',
      });

      setIsAuthDialogOpen(true);
    } catch (error: any) {
      toast({
        title: 'Authorization Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Exports the current document to Google Docs. Triggers the auth flow if
   * the user is not yet authenticated, then opens the new Google Doc in a
   * new browser tab.
   */
  const handleExport = async () => {
    if (!isAuthenticated) {
      handleAuth();
      return;
    }

    try {
      setIsLoading(true);
      const result = await googleDocsApi.exportToGoogleDocs(documentId, accessToken, refreshToken);

      setGoogleDocId(result.googleDocId);

      toast({
        title: 'Export Successful',
        description: 'Document exported to Google Docs',
      });

      // Open Google Doc in new tab
      window.open(result.url, '_blank');
    } catch (error: any) {
      toast({
        title: 'Export Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Imports a Google Doc into the editor by its Doc ID. Triggers the auth
   * flow if not authenticated, then reloads the page to show the new document.
   */
  const handleImport = async () => {
    if (!isAuthenticated) {
      handleAuth();
      return;
    }

    if (!importDocId) {
      toast({
        title: 'Import Failed',
        description: 'Please enter a Google Doc ID',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsLoading(true);
      const imported = await googleDocsApi.importFromGoogleDocs(
        importDocId,
        accessToken,
        refreshToken,
        null
      );

      toast({
        title: 'Import Successful',
        description: `Imported "${imported.title}"`,
      });

      // Reload page to show new document
      window.location.reload();
    } catch (error: any) {
      toast({
        title: 'Import Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Generates a publicly shareable link for the exported Google Doc and
   * copies it to the clipboard.
   */
  const handleGetShareableLink = async () => {
    if (!isAuthenticated || !googleDocId) {
      toast({
        title: 'Error',
        description: 'Please export to Google Docs first',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsLoading(true);
      const link = await googleDocsApi.getShareableLink(googleDocId, accessToken, refreshToken);

      setShareableLink(link);

      // Copy to clipboard
      await navigator.clipboard.writeText(link);

      toast({
        title: 'Link Copied',
        description: 'Shareable link copied to clipboard',
      });
    } catch (error: any) {
      toast({
        title: 'Failed to Get Link',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Grants access to a specific user by e-mail address at the given role.
   * Validates that the document has been exported and an e-mail is provided
   * before calling the backend API.
   */
  const handleShareWithUser = async () => {
    if (!isAuthenticated || !googleDocId) {
      toast({
        title: 'Error',
        description: 'Please export to Google Docs first',
        variant: 'destructive',
      });
      return;
    }

    if (!shareEmail) {
      toast({
        title: 'Error',
        description: 'Please enter an email address',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsLoading(true);
      await googleDocsApi.shareWithUser(
        googleDocId,
        shareEmail,
        accessToken,
        shareRole,
        refreshToken
      );

      toast({
        title: 'Shared Successfully',
        description: `Document shared with ${shareEmail} as ${shareRole}`,
      });

      setShareEmail('');
    } catch (error: any) {
      toast({
        title: 'Share Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg">
      <h3 className="font-semibold text-lg">Google Docs Integration</h3>

      {/* Auth Status */}
      <div className="flex items-center gap-2">
        <div className={`h-2 w-2 rounded-full ${isAuthenticated ? 'bg-green-500' : 'bg-gray-400'}`} />
        <span className="text-sm text-muted-foreground">
          {isAuthenticated ? 'Authenticated' : 'Not authenticated'}
        </span>
      </div>

      {/* Auth Dialog */}
      <Dialog open={isAuthDialogOpen} onOpenChange={setIsAuthDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Google OAuth Tokens</DialogTitle>
            <DialogDescription>
              After authorizing, paste your access and refresh tokens below.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="accessToken">Access Token</Label>
              <Input
                id="accessToken"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                placeholder="ya29.a0..."
              />
            </div>
            <div>
              <Label htmlFor="refreshToken">Refresh Token (Optional)</Label>
              <Input
                id="refreshToken"
                value={refreshToken}
                onChange={(e) => setRefreshToken(e.target.value)}
                placeholder="1//0e..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsAuthDialogOpen(false)}>Save Tokens</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-2">
        {/* Export Button */}
        <Button
          onClick={handleExport}
          disabled={isLoading}
          variant="outline"
          className="w-full"
        >
          <Upload className="mr-2 h-4 w-4" />
          Export to Google Docs
        </Button>

        {/* Import Button */}
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" disabled={isLoading} className="w-full">
              <Download className="mr-2 h-4 w-4" />
              Import from Google Docs
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Import from Google Docs</DialogTitle>
              <DialogDescription>
                Enter the Google Doc ID (from the URL)
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="importDocId">Google Doc ID</Label>
                <Input
                  id="importDocId"
                  value={importDocId}
                  onChange={(e) => setImportDocId(e.target.value)}
                  placeholder="1a2b3c4d5e6f..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleImport} disabled={isLoading || !importDocId}>
                Import
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Get Shareable Link */}
        <Button
          onClick={handleGetShareableLink}
          disabled={isLoading || !googleDocId}
          variant="outline"
          className="w-full"
        >
          <Link2 className="mr-2 h-4 w-4" />
          Get Shareable Link
        </Button>

        {/* Share with User */}
        <Dialog>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              disabled={isLoading || !googleDocId}
              className="w-full"
            >
              <Mail className="mr-2 h-4 w-4" />
              Share with User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Share with User</DialogTitle>
              <DialogDescription>
                Enter the email address and role
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="shareEmail">Email Address</Label>
                <Input
                  id="shareEmail"
                  type="email"
                  value={shareEmail}
                  onChange={(e) => setShareEmail(e.target.value)}
                  placeholder="user@example.com"
                />
              </div>
              <div>
                <Label htmlFor="shareRole">Role</Label>
                <select
                  id="shareRole"
                  value={shareRole}
                  onChange={(e) => setShareRole(e.target.value as any)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2"
                >
                  <option value="reader">Reader</option>
                  <option value="writer">Writer</option>
                  <option value="commenter">Commenter</option>
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={handleShareWithUser}
                disabled={isLoading || !shareEmail}
              >
                Share
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Status Info */}
      {googleDocId && (
        <div className="p-3 bg-muted rounded-md space-y-2">
          <div className="flex items-center gap-2">
            <Share2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Google Doc ID:</span>
            <code className="text-xs bg-background px-2 py-1 rounded">{googleDocId}</code>
          </div>
          {shareableLink && (
            <div className="flex items-center gap-2">
              <Link2 className="h-4 w-4 text-muted-foreground" />
              <a
                href={shareableLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline truncate flex-1"
              >
                {shareableLink}
              </a>
            </div>
          )}
        </div>
      )}

      {!isAuthenticated && (
        <Button onClick={handleAuth} disabled={isLoading} className="w-full">
          Authenticate with Google
        </Button>
      )}
    </div>
  );
};
