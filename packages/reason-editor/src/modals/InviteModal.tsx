import { useState } from 'react';
import { UserPlus, Users, Mail, X, Crown, Shield, Eye, Edit3, Link2, Globe, Lock, MessageSquare } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Separator } from '../ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { ScrollArea } from '../ui/scroll-area';
import { Switch } from '../ui/switch';
import { toast } from 'sonner';
import { Team } from '../types/team';
import { SharingInfo } from '../types/document';
import grab from 'grab-url';

interface InviteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentTitle: string;
  documentId: string;
  sharingInfo?: SharingInfo;
  teams?: Team[];
  onUpdateSharing?: (sharing: SharingInfo) => void;
}

const roleIcons = {
  viewer: <Eye className="h-3 w-3" />,
  commentor: <MessageSquare className="h-3 w-3" />,
  editor: <Edit3 className="h-3 w-3" />,
};

const roleColors = {
  viewer: 'bg-gray-500/10 text-gray-700 dark:text-gray-400',
  commentor: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
  editor: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
};

export const InviteModal = ({
  open,
  onOpenChange,
  documentTitle,
  documentId,
  sharingInfo,
  teams = [],
  onUpdateSharing,
}: InviteModalProps) => {
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<'viewer' | 'commentor' | 'editor'>('editor');
  const [isPublic, setIsPublic] = useState(sharingInfo?.isPublic || false);
  const [sharedWith, setSharedWith] = useState(sharingInfo?.sharedWith || []);
  const [shareLink, setShareLink] = useState<string | null>(sharingInfo?.shareLink || null);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);

  const handleInvite = () => {
    if (!newEmail.trim()) return;

    // Check if already shared
    if (sharedWith.find(user => user.email === newEmail)) {
      toast.error('Already shared with this user');
      return;
    }

    const newUser = {
      email: newEmail,
      role: newRole,
      sharedAt: new Date().toISOString(),
    };

    const updatedShared = [...sharedWith, newUser];
    setSharedWith(updatedShared);

    if (onUpdateSharing) {
      onUpdateSharing({
        ...sharingInfo,
        isPublic,
        sharedWith: updatedShared,
      });
    }

    setNewEmail('');
    toast.success(`Invited ${newEmail}`);
  };

  const handleRemoveUser = (email: string) => {
    const updatedShared = sharedWith.filter(user => user.email !== email);
    setSharedWith(updatedShared);

    if (onUpdateSharing) {
      onUpdateSharing({
        ...sharingInfo,
        isPublic,
        sharedWith: updatedShared,
      });
    }

    toast.success('Access removed');
  };

  const handleUpdateRole = (email: string, newRole: 'viewer' | 'commentor' | 'editor') => {
    const updatedShared = sharedWith.map(user =>
      user.email === email ? { ...user, role: newRole } : user
    );
    setSharedWith(updatedShared);

    if (onUpdateSharing) {
      onUpdateSharing({
        ...sharingInfo,
        isPublic,
        sharedWith: updatedShared,
      });
    }

    toast.success('Role updated');
  };

  const handleTogglePublic = async (checked: boolean) => {
    setIsPublic(checked);

    // Generate share link if making public and link doesn't exist
    if (checked && !shareLink) {
      await generateShareLink();
    }

    if (onUpdateSharing) {
      onUpdateSharing({
        ...sharingInfo,
        isPublic: checked,
        sharedWith,
        shareLink,
      });
    }

    toast.success(checked ? 'Document is now public' : 'Document is now private');
  };

  const generateShareLink = async () => {
    if (isGeneratingLink) return;

    setIsGeneratingLink(true);
    try {
      const data = await grab('doc/share', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: { documentId },
      });

      if (data.success) {
        setShareLink(data.data.shareUrl);

        if (onUpdateSharing) {
          onUpdateSharing({
            ...sharingInfo,
            isPublic,
            sharedWith,
            shareLink: data.data.shareUrl,
          });
        }

        return data.data.shareUrl;
      } else {
        toast.error(data.error || 'Failed to generate share link');
        return null;
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate share link');
      return null;
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const handleCopyLink = async () => {
    let linkToCopy = shareLink;

    // Generate link if it doesn't exist
    if (!linkToCopy) {
      linkToCopy = await generateShareLink();
      if (!linkToCopy) return;
    }

    navigator.clipboard.writeText(linkToCopy);
    toast.success('Link copied to clipboard');
  };

  const getInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            <DialogTitle>Share "{documentTitle}"</DialogTitle>
          </div>
          <DialogDescription>
            Invite people or share with teams
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Public Access Toggle */}
          <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
            <div className="flex items-center gap-3">
              {isPublic ? (
                <Globe className="h-5 w-5 text-primary" />
              ) : (
                <Lock className="h-5 w-5 text-muted-foreground" />
              )}
              <div>
                <p className="font-medium text-sm">
                  {isPublic ? 'Public Access' : 'Private'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isPublic
                    ? 'Anyone with the link can view'
                    : 'Only invited people can access'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isPublic && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyLink}
                  className="h-8"
                >
                  <Link2 className="h-4 w-4" />
                </Button>
              )}
              <Switch checked={isPublic} onCheckedChange={handleTogglePublic} />
            </div>
          </div>

          {/* Invite Input */}
          <div className="space-y-3">
            <Label>Invite by email</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="colleague@example.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleInvite()}
                  className="pl-9"
                />
              </div>
              <Select value={newRole} onValueChange={(value: 'viewer' | 'commentor' | 'editor') => setNewRole(value)}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="editor">
                    <span className="flex items-center gap-2">
                      <Edit3 className="h-3 w-3" />
                      Editor
                    </span>
                  </SelectItem>
                  <SelectItem value="commentor">
                    <span className="flex items-center gap-2">
                      <MessageSquare className="h-3 w-3" />
                      Commentor
                    </span>
                  </SelectItem>
                  <SelectItem value="viewer">
                    <span className="flex items-center gap-2">
                      <Eye className="h-3 w-3" />
                      Viewer
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleInvite}>Invite</Button>
            </div>
          </div>

          <Separator />

          {/* Teams with Access */}
          {teams.length > 0 && (
            <>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <h4 className="text-sm font-semibold">Teams with access</h4>
                </div>
                <div className="space-y-2">
                  {teams.map((team) => (
                    <div
                      key={team.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-primary/10 text-primary">
                            <Users className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{team.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {team.members.length} member{team.members.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="bg-blue-500/10 text-blue-700 dark:text-blue-400">
                        <Edit3 className="h-3 w-3 mr-1" />
                        Team
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* People with Access */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">People with access</h4>
            <ScrollArea className="max-h-[300px]">
              {sharedWith.length > 0 ? (
                <div className="space-y-2 pr-4">
                  {sharedWith.map((user) => (
                    <div
                      key={user.email}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10">
                            {getInitials(user.email)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{user.email}</p>
                          <p className="text-xs text-muted-foreground">
                            Added {new Date(user.sharedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Select
                          value={user.role || 'viewer'}
                          onValueChange={(value: 'viewer' | 'commentor' | 'editor') =>
                            handleUpdateRole(user.email, value)
                          }
                        >
                          <SelectTrigger className="h-8 w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="editor">
                              <span className="flex items-center gap-2">
                                <Edit3 className="h-3 w-3" />
                                Editor
                              </span>
                            </SelectItem>
                            <SelectItem value="commentor">
                              <span className="flex items-center gap-2">
                                <MessageSquare className="h-3 w-3" />
                                Commentor
                              </span>
                            </SelectItem>
                            <SelectItem value="viewer">
                              <span className="flex items-center gap-2">
                                <Eye className="h-3 w-3" />
                                Viewer
                              </span>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveUser(user.email)}
                          className="h-8 w-8 p-0"
                        >
                          <X className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <UserPlus className="h-12 w-12 text-muted-foreground mb-3 opacity-50" />
                  <p className="text-sm text-muted-foreground">
                    No one else has access yet
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Invite people to collaborate
                  </p>
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
