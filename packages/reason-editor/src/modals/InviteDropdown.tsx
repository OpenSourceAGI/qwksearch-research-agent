import { useState } from 'react';
import { UserPlus, Users, Mail, X, Eye, Edit3, Link2, Globe, Lock, MessageSquare } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Avatar, AvatarFallback } from '../ui/avatar';
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

interface InviteDropdownProps {
  documentTitle: string;
  documentId: string;
  sharingInfo?: SharingInfo;
  teams?: Team[];
  onUpdateSharing?: (sharing: SharingInfo) => void;
}

export const InviteDropdown = ({
  documentTitle,
  documentId,
  sharingInfo,
  teams = [],
  onUpdateSharing,
}: InviteDropdownProps) => {
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<'viewer' | 'commentor' | 'editor'>('editor');
  const [isPublic, setIsPublic] = useState(sharingInfo?.isPublic || false);
  const [sharedWith, setSharedWith] = useState(sharingInfo?.sharedWith || []);
  const [shareLink, setShareLink] = useState<string | null>(sharingInfo?.shareLink || null);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);

  const handleInvite = () => {
    if (!newEmail.trim()) return;

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
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <UserPlus className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96 max-h-[600px] overflow-y-auto bg-popover/80 backdrop-blur-md">
        <DropdownMenuLabel className="flex items-center gap-2 text-base">
          <UserPlus className="h-4 w-4" />
          Share "{documentTitle}"
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* Public Access Toggle */}
        <div className="px-2 py-3">
          <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
            <div className="flex items-center gap-3">
              {isPublic ? (
                <Globe className="h-4 w-4 text-primary" />
              ) : (
                <Lock className="h-4 w-4 text-muted-foreground" />
              )}
              <div>
                <p className="font-medium text-xs">
                  {isPublic ? 'Public Access' : 'Private'}
                </p>
                <p className="text-[10px] text-muted-foreground">
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
                  className="h-7 w-7 p-0"
                >
                  <Link2 className="h-3 w-3" />
                </Button>
              )}
              <Switch checked={isPublic} onCheckedChange={handleTogglePublic} />
            </div>
          </div>
        </div>

        <DropdownMenuSeparator />

        {/* Invite Input */}
        <div className="px-2 py-3 space-y-2">
          <Label className="text-xs">Invite by email</Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Mail className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
              <Input
                type="email"
                placeholder="email@example.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleInvite()}
                className="pl-7 h-8 text-xs"
              />
            </div>
            <Select value={newRole} onValueChange={(value: 'viewer' | 'commentor' | 'editor') => setNewRole(value)}>
              <SelectTrigger className="w-24 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="editor">
                  <span className="flex items-center gap-2 text-xs">
                    <Edit3 className="h-3 w-3" />
                    Editor
                  </span>
                </SelectItem>
                <SelectItem value="commentor">
                  <span className="flex items-center gap-2 text-xs">
                    <MessageSquare className="h-3 w-3" />
                    Commentor
                  </span>
                </SelectItem>
                <SelectItem value="viewer">
                  <span className="flex items-center gap-2 text-xs">
                    <Eye className="h-3 w-3" />
                    Viewer
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleInvite} size="sm" className="w-full h-8 text-xs">
            Invite
          </Button>
        </div>

        <DropdownMenuSeparator />

        {/* Teams with Access */}
        {teams.length > 0 && (
          <>
            <div className="px-2 py-2">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-3 w-3 text-muted-foreground" />
                <h4 className="text-xs font-semibold">Teams with access</h4>
              </div>
              <ScrollArea className="max-h-[100px]">
                <div className="space-y-1.5 pr-2">
                  {teams.map((team) => (
                    <div
                      key={team.id}
                      className="flex items-center justify-between p-2 rounded-lg border bg-card"
                    >
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                            <Users className="h-3 w-3" />
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-xs font-medium">{team.name}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {team.members.length} member{team.members.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
            <DropdownMenuSeparator />
          </>
        )}

        {/* People with Access */}
        <div className="px-2 py-2">
          <h4 className="text-xs font-semibold mb-2">People with access</h4>
          <ScrollArea className="max-h-[200px]">
            {sharedWith.length > 0 ? (
              <div className="space-y-1.5 pr-2">
                {sharedWith.map((user) => (
                  <div
                    key={user.email}
                    className="flex items-center justify-between p-2 rounded-lg border bg-card"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Avatar className="h-6 w-6 flex-shrink-0">
                        <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-[10px]">
                          {getInitials(user.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium truncate">{user.email}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(user.sharedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Select
                        value={user.role || 'viewer'}
                        onValueChange={(value: 'viewer' | 'commentor' | 'editor') =>
                          handleUpdateRole(user.email, value)
                        }
                      >
                        <SelectTrigger className="h-7 w-20 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="editor">
                            <span className="flex items-center gap-1 text-xs">
                              <Edit3 className="h-3 w-3" />
                              Editor
                            </span>
                          </SelectItem>
                          <SelectItem value="commentor">
                            <span className="flex items-center gap-1 text-xs">
                              <MessageSquare className="h-3 w-3" />
                              Commentor
                            </span>
                          </SelectItem>
                          <SelectItem value="viewer">
                            <span className="flex items-center gap-1 text-xs">
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
                        className="h-7 w-7 p-0"
                      >
                        <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <UserPlus className="h-8 w-8 text-muted-foreground mb-2 opacity-50" />
                <p className="text-xs text-muted-foreground">
                  No one else has access yet
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Invite people to collaborate
                </p>
              </div>
            )}
          </ScrollArea>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
