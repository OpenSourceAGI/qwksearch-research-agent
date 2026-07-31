/**
 * @module TeamManagement
 * @description Dialog for managing teams and organizations. Allows inviting
 * members, updating roles, removing members, and creating new teams within
 * the current organization. Data is persisted to `localStorage`.
 */
import { useState } from 'react';
import { Users, Plus, Trash2, UserPlus, Mail, Crown, Shield, Eye, Building2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../../app-ui/dialog';
import { Button } from '../../app-ui/button';
import { Input } from '../../app-ui/input';
import { Label } from '../../app-ui/label';
import { Separator } from '../../app-ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../app-ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '../../app-ui/avatar';
import { Badge } from '../../app-ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../app-ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../app-ui/alert-dialog';
import { Organization, Team, TeamMember, UserRole } from '../../app-types/team';
import { useLocalStorage } from '../../app-hooks/useLocalStorage';
import { toast } from 'sonner';
import { ScrollArea } from '../../app-ui/scroll-area';

/** Props for the {@link TeamManagement} dialog. */
interface TeamManagementProps {
  /** Whether the dialog is visible. */
  open: boolean;
  /** Callback to open or close the dialog. */
  onOpenChange: (open: boolean) => void;
}

/** Maps `UserRole` values to their corresponding icon elements. */
const roleIcons: Record<UserRole, React.ReactNode> = {
  owner: <Crown className="h-3 w-3" />,
  admin: <Shield className="h-3 w-3" />,
  member: <Users className="h-3 w-3" />,
  viewer: <Eye className="h-3 w-3" />,
};

/** Maps `UserRole` values to Tailwind badge colour class strings. */
const roleColors: Record<UserRole, string> = {
  owner: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
  admin: 'bg-purple-500/10 text-purple-700 dark:text-purple-400',
  member: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
  viewer: 'bg-gray-500/10 text-gray-700 dark:text-gray-400',
};

/**
 * Full-featured teams and organizations management dialog. Persists all
 * organization data to `localStorage` via `useLocalStorage`.
 */
export const TeamManagement = ({ open, onOpenChange }: TeamManagementProps) => {
  const [organizations, setOrganizations] = useLocalStorage<Organization[]>('REASON-organizations', [
    {
      id: '1',
      name: 'My Organization',
      slug: 'my-org',
      description: 'Your personal workspace',
      teams: [
        {
          id: '1',
          name: 'General',
          description: 'Default team for collaboration',
          members: [
            {
              id: '1',
              name: 'You',
              email: 'you@example.com',
              role: 'owner',
              joinedAt: new Date(),
            },
          ],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]);

  const [selectedOrgId, _setSelectedOrgId] = useState(organizations[0]?.id || null);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showDeleteMember, setShowDeleteMember] = useState<TeamMember | null>(null);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<UserRole>('member');

  const selectedOrg = organizations.find((org) => org.id === selectedOrgId);
  const selectedTeam = selectedOrg?.teams.find((team) => team.id === selectedTeamId);

  /**
   * Invites a new member to the currently selected team.
   * The member's display name is inferred from the e-mail local-part.
   */
  const handleAddMember = () => {
    if (!newMemberEmail.trim() || !selectedOrgId || !selectedTeamId) return;

    const newMember: TeamMember = {
      id: Date.now().toString(),
      name: newMemberEmail.split('@')[0],
      email: newMemberEmail,
      role: newMemberRole,
      joinedAt: new Date(),
    };

    setOrganizations((orgs) =>
      orgs.map((org) =>
        org.id === selectedOrgId
          ? {
            ...org,
            teams: org.teams.map((team) =>
              team.id === selectedTeamId
                ? {
                  ...team,
                  members: [...team.members, newMember],
                  updatedAt: new Date(),
                }
                : team
            ),
          }
          : org
      )
    );

    setNewMemberEmail('');
    setNewMemberRole('member');
    setShowAddMember(false);
    toast.success('Member invited');
  };

  /**
   * Removes a member from the selected team by their ID.
   * Non-owner members are checked by the UI before this is called.
   *
   * @param memberId - ID of the member to remove.
   */
  const handleRemoveMember = (memberId: string) => {
    if (!selectedOrgId || !selectedTeamId) return;

    setOrganizations((orgs) =>
      orgs.map((org) =>
        org.id === selectedOrgId
          ? {
            ...org,
            teams: org.teams.map((team) =>
              team.id === selectedTeamId
                ? {
                  ...team,
                  members: team.members.filter((m) => m.id !== memberId),
                  updatedAt: new Date(),
                }
                : team
            ),
          }
          : org
      )
    );

    setShowDeleteMember(null);
    toast.success('Member removed');
  };

  /**
   * Updates the role of an existing team member.
   *
   * @param memberId - ID of the member whose role should change.
   * @param newRole - The new role to assign.
   */
  const handleUpdateMemberRole = (memberId: string, newRole: UserRole) => {
    if (!selectedOrgId || !selectedTeamId) return;

    setOrganizations((orgs) =>
      orgs.map((org) =>
        org.id === selectedOrgId
          ? {
            ...org,
            teams: org.teams.map((team) =>
              team.id === selectedTeamId
                ? {
                  ...team,
                  members: team.members.map((m) =>
                    m.id === memberId ? { ...m, role: newRole } : m
                  ),
                  updatedAt: new Date(),
                }
                : team
            ),
          }
          : org
      )
    );

    toast.success('Role updated');
  };

  /**
   * Creates a new "New Team" within the selected organization and immediately
   * selects it for further configuration.
   */
  const handleCreateTeam = () => {
    if (!selectedOrgId) return;

    const newTeam: Team = {
      id: Date.now().toString(),
      name: 'New Team',
      members: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    setOrganizations((orgs) =>
      orgs.map((org) =>
        org.id === selectedOrgId
          ? {
            ...org,
            teams: [...org.teams, newTeam],
            updatedAt: new Date(),
          }
          : org
      )
    );

    setSelectedTeamId(newTeam.id);
    toast.success('Team created');
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[85vh]">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              <DialogTitle>Teams & Organizations</DialogTitle>
            </div>
            <DialogDescription>
              Manage your teams and collaborate with others
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="teams" className="flex-1">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="teams">Teams</TabsTrigger>
              <TabsTrigger value="organizations">Organizations</TabsTrigger>
            </TabsList>

            <TabsContent value="teams" className="space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="font-semibold">Your Teams</h3>
                  <p className="text-sm text-muted-foreground">
                    Collaborate with team members
                  </p>
                </div>
                <Button onClick={handleCreateTeam} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  New Team
                </Button>
              </div>

              <Separator />

              <ScrollArea className="h-[50vh]">
                {selectedOrg && selectedOrg.teams.length > 0 ? (
                  <div className="space-y-4">
                    {selectedOrg.teams.map((team) => (
                      <div
                        key={team.id}
                        className="border rounded-lg p-4 space-y-4"
                      >
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <h4 className="font-semibold flex items-center gap-2">
                              <Users className="h-4 w-4" />
                              {team.name}
                            </h4>
                            {team.description && (
                              <p className="text-sm text-muted-foreground">
                                {team.description}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              {team.members.length} member
                              {team.members.length !== 1 ? 's' : ''}
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedTeamId(team.id);
                              setShowAddMember(true);
                            }}
                          >
                            <UserPlus className="h-4 w-4 mr-2" />
                            Invite
                          </Button>
                        </div>

                        <div className="space-y-2">
                          {team.members.map((member) => (
                            <div
                              key={member.id}
                              className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50"
                            >
                              <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={member.avatarUrl} />
                                  <AvatarFallback>
                                    {member.name.substring(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="text-sm font-medium">
                                    {member.name}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {member.email}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant="secondary"
                                  className={roleColors[member.role]}
                                >
                                  <span className="mr-1">{roleIcons[member.role]}</span>
                                  {member.role}
                                </Badge>
                                {member.role !== 'owner' && (
                                  <>
                                    <Select
                                      value={member.role}
                                      onValueChange={(value) =>
                                        handleUpdateMemberRole(member.id, value as UserRole)
                                      }
                                    >
                                      <SelectTrigger className="h-8 w-28">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="admin">Admin</SelectItem>
                                        <SelectItem value="member">Member</SelectItem>
                                        <SelectItem value="viewer">Viewer</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setShowDeleteMember(member)}
                                    >
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Users className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                    <p className="text-sm text-muted-foreground">
                      No teams yet. Create your first team to get started.
                    </p>
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="organizations" className="space-y-4 mt-4">
              <div className="space-y-1">
                <h3 className="font-semibold">Your Organizations</h3>
                <p className="text-sm text-muted-foreground">
                  Manage organization settings and details
                </p>
              </div>

              <Separator />

              <ScrollArea className="h-[50vh]">
                {organizations.map((org) => (
                  <div
                    key={org.id}
                    className="border rounded-lg p-4 space-y-4 mb-4"
                  >
                    <div className="flex items-start gap-4">
                      <Avatar className="h-16 w-16">
                        <AvatarImage src={org.logoUrl} />
                        <AvatarFallback className="text-lg">
                          {org.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-1">
                        <h4 className="font-semibold text-lg">{org.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {org.slug}
                        </p>
                        {org.description && (
                          <p className="text-sm">{org.description}</p>
                        )}
                        <div className="flex gap-4 text-xs text-muted-foreground pt-2">
                          <span>{org.teams.length} teams</span>
                          <span>
                            {org.teams.reduce((sum, team) => sum + team.members.length, 0)}{' '}
                            members
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Add Member Dialog */}
      <Dialog open={showAddMember} onOpenChange={setShowAddMember}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
            <DialogDescription>
              Send an invitation to join {selectedTeam?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="colleague@example.com"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={newMemberRole} onValueChange={(value) => setNewMemberRole(value as UserRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowAddMember(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddMember}>Send Invitation</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Member Confirmation */}
      <AlertDialog
        open={!!showDeleteMember}
        onOpenChange={() => setShowDeleteMember(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {showDeleteMember?.name} from the team?
              They will lose access to all team resources.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => showDeleteMember && handleRemoveMember(showDeleteMember.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
