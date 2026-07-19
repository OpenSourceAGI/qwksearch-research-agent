/**
 * @module DocumentActionsMenu
 * Dropdown menu for document-level actions including status, priority, metadata editing, sharing, and export.
 */
import { DocumentExtended, DocumentMetadata, SharingInfo } from '../types/document';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuCheckboxItem,
} from '../ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import {
  MoreVertical,
  Share2,
  Tag,
  Clock,
  Trash2,
  Copy,
  Download,
  Upload,
  FileText,
  Calendar,
  AlertCircle,
  Link2,
  Users,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface DocumentActionsMenuProps {
  document: DocumentExtended;
  onMetadataUpdate: (metadata: DocumentMetadata) => void;
  onSharingUpdate: (sharing: SharingInfo) => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  onExport?: () => void;
}

export const DocumentActionsMenu = ({
  document,
  onMetadataUpdate,
  onSharingUpdate,
  onDelete,
  onDuplicate,
  onExport,
}: DocumentActionsMenuProps) => {
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [isMetadataDialogOpen, setIsMetadataDialogOpen] = useState(false);
  const [shareEmail, setShareEmail] = useState('');
  const [shareRole, setShareRole] = useState<'viewer' | 'editor'>('viewer');
  const [tags, setTags] = useState(document.metadata?.tags?.join(', ') || '');
  const [category, setCategory] = useState(document.metadata?.category || '');
  const [dueDate, setDueDate] = useState(document.metadata?.dueDate || '');

  const handleAddTag = () => {
    if (!tags.trim()) return;
    const newTags = tags.split(',').map(t => t.trim()).filter(Boolean);
    onMetadataUpdate({
      ...document.metadata,
      tags: newTags,
    });
    toast.success('Tags updated');
  };

  const handleUpdateMetadata = () => {
    onMetadataUpdate({
      ...document.metadata,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      category: category || undefined,
      dueDate: dueDate || undefined,
    });
    setIsMetadataDialogOpen(false);
    toast.success('Metadata updated');
  };

  const handleShareDocument = () => {
    if (!shareEmail.trim()) {
      toast.error('Please enter an email address');
      return;
    }

    const currentSharing = document.sharing || { isPublic: false };
    const sharedWith = currentSharing.sharedWith || [];

    onSharingUpdate({
      ...currentSharing,
      sharedWith: [
        ...sharedWith,
        {
          email: shareEmail,
          role: shareRole,
          sharedAt: new Date().toISOString(),
        },
      ],
    });

    setShareEmail('');
    toast.success(`Shared with ${shareEmail}`);
  };

  const handleTogglePublic = () => {
    const currentSharing = document.sharing || { isPublic: false };
    onSharingUpdate({
      ...currentSharing,
      isPublic: !currentSharing.isPublic,
    });
    toast.success(currentSharing.isPublic ? 'Document is now private' : 'Document is now public');
  };

  const handleCopyShareLink = () => {
    const link = `${window.location.origin}/doc/${document.id}`;
    navigator.clipboard.writeText(link);
    toast.success('Share link copied to clipboard');
  };

  const handleStatusChange = (status: 'draft' | 'in-progress' | 'review' | 'final') => {
    onMetadataUpdate({
      ...document.metadata,
      status,
    });
    toast.success(`Status updated to ${status}`);
  };

  const handlePriorityChange = (priority: 'low' | 'medium' | 'high') => {
    onMetadataUpdate({
      ...document.metadata,
      priority,
    });
    toast.success(`Priority set to ${priority}`);
  };

  const statusColors = {
    draft: 'bg-gray-500',
    'in-progress': 'bg-blue-500',
    review: 'bg-yellow-500',
    final: 'bg-green-500',
  };

  const priorityColors = {
    low: 'bg-gray-400',
    medium: 'bg-orange-400',
    high: 'bg-red-500',
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="flex items-center justify-between">
            Document Actions
            {document.metadata?.status && (
              <Badge
                className={`${statusColors[document.metadata.status]} text-white`}
                variant="secondary"
              >
                {document.metadata.status}
              </Badge>
            )}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          {/* Status submenu */}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <FileText className="mr-2 h-4 w-4" />
              <span>Status</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuCheckboxItem
                checked={document.metadata?.status === 'draft'}
                onCheckedChange={() => handleStatusChange('draft')}
              >
                Draft
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={document.metadata?.status === 'in-progress'}
                onCheckedChange={() => handleStatusChange('in-progress')}
              >
                In Progress
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={document.metadata?.status === 'review'}
                onCheckedChange={() => handleStatusChange('review')}
              >
                Review
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={document.metadata?.status === 'final'}
                onCheckedChange={() => handleStatusChange('final')}
              >
                Final
              </DropdownMenuCheckboxItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          {/* Priority submenu */}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <AlertCircle className="mr-2 h-4 w-4" />
              <span>Priority</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuCheckboxItem
                checked={document.metadata?.priority === 'low'}
                onCheckedChange={() => handlePriorityChange('low')}
              >
                Low
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={document.metadata?.priority === 'medium'}
                onCheckedChange={() => handlePriorityChange('medium')}
              >
                Medium
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={document.metadata?.priority === 'high'}
                onCheckedChange={() => handlePriorityChange('high')}
              >
                High
              </DropdownMenuCheckboxItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={() => setIsMetadataDialogOpen(true)}>
            <Tag className="mr-2 h-4 w-4" />
            <span>Edit Metadata</span>
          </DropdownMenuItem>

          <DropdownMenuItem onClick={() => setIsShareDialogOpen(true)}>
            <Share2 className="mr-2 h-4 w-4" />
            <span>Share Document</span>
            {document.sharing?.isPublic && (
              <Badge className="ml-auto" variant="secondary">Public</Badge>
            )}
          </DropdownMenuItem>

          {document.sharing?.isPublic && (
            <DropdownMenuItem onClick={handleCopyShareLink}>
              <Link2 className="mr-2 h-4 w-4" />
              <span>Copy Share Link</span>
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={onDuplicate}>
            <Copy className="mr-2 h-4 w-4" />
            <span>Duplicate</span>
          </DropdownMenuItem>

          <DropdownMenuItem onClick={onExport}>
            <Download className="mr-2 h-4 w-4" />
            <span>Export</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
            <Trash2 className="mr-2 h-4 w-4" />
            <span>Delete</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Metadata Dialog */}
      <Dialog open={isMetadataDialogOpen} onOpenChange={setIsMetadataDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Metadata</DialogTitle>
            <DialogDescription>
              Add tags, categories, and other metadata to organize your document
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input
                id="tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="research, important, draft"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Press Enter or click Update to save
              </p>
            </div>
            <div>
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Work, Personal, Research, etc."
              />
            </div>
            <div>
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMetadataDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateMetadata}>Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sharing Dialog */}
      <Dialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Document</DialogTitle>
            <DialogDescription>
              Share this document with others or make it public
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Public Access</p>
                <p className="text-sm text-muted-foreground">
                  Anyone with the link can view
                </p>
              </div>
              <Button
                variant={document.sharing?.isPublic ? 'default' : 'outline'}
                onClick={handleTogglePublic}
                size="sm"
              >
                {document.sharing?.isPublic ? 'Public' : 'Private'}
              </Button>
            </div>

            <DropdownMenuSeparator />

            <div>
              <Label htmlFor="shareEmail">Share with specific person</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  id="shareEmail"
                  type="email"
                  value={shareEmail}
                  onChange={(e) => setShareEmail(e.target.value)}
                  placeholder="email@example.com"
                />
                <select
                  value={shareRole}
                  onChange={(e) => setShareRole(e.target.value as 'viewer' | 'editor')}
                  className="rounded-md border border-input bg-background px-3 py-2"
                >
                  <option value="viewer">Viewer</option>
                  <option value="editor">Editor</option>
                </select>
              </div>
              <Button onClick={handleShareDocument} size="sm" className="mt-2 w-full">
                <Users className="mr-2 h-4 w-4" />
                Share
              </Button>
            </div>

            {document.sharing?.sharedWith && document.sharing.sharedWith.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <div>
                  <p className="text-sm font-medium mb-2">Shared with</p>
                  <div className="space-y-2">
                    {document.sharing.sharedWith.map((share, index) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <span>{share.email}</span>
                        <Badge variant="secondary">{share.role}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
