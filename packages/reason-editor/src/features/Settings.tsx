/**
 * @module Settings
 * @description Full-screen settings dialog featuring a sectioned sidebar nav
 * (Appearance, Storage, File Sources, AI Rewrite Modes, About). Each section
 * is rendered by the internal `renderContent` switch.
 */
import { useTheme } from 'next-themes';
import { useState, useEffect } from 'react';
import {
  Moon,
  Sun,
  Monitor,
  Settings as SettingsIcon,
  Plus,
  Trash2,
  RotateCcw,
  Edit2,
  Paintbrush,
  Info,
  Wand2,
  HardDrive,
  Server,
  Cloud,
  Database,
  FileText,
  Workflow,
  LogIn
} from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "../ui/breadcrumb";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '../ui/dialog';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "../ui/sidebar";
import { Label } from '../ui/label';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Separator } from '../ui/separator';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { ThemeDropdown } from '../theme/theme-dropdown';
import { getRewriteModes, saveRewriteModes, resetRewriteModes, RewriteMode } from './ai-rewrite/rewriteModes';
import { getFileSources, addFileSource, updateFileSource, deleteFileSource } from '../lib/file-sources/sources';
import { AnyFileSource, FileSourceType, SSHCredentials, S3Credentials, R2Credentials, B2Credentials, GoogleDocsCredentials, TursoDBCredentials } from '../types/fileSource';
import { toast } from 'sonner';

/** Props for the {@link Settings} dialog component. */
interface SettingsProps {
  /** Whether the dialog is visible. */
  open: boolean;
  /** Callback to open or close the dialog. */
  onOpenChange: (open: boolean) => void;
  /** Section to navigate to when the dialog opens. */
  initialSection?: string;
  /** Currently selected default sidebar view mode. */
  defaultSidebarView?: 'tree' | 'outline' | 'split' | 'last-used';
  /** Called when the user picks a different default sidebar view. */
  onDefaultSidebarViewChange?: (view: 'tree' | 'outline' | 'split' | 'last-used') => void;
  /** Whether database sync is currently enabled. */
  enableDatabaseSync?: boolean;
  /** Called when the user toggles database sync. */
  onEnableDatabaseSyncChange?: (enabled: boolean) => void;
}

const settingsNav = [
  { name: "Appearance", icon: Paintbrush },
  { name: "Storage", icon: Database },
  { name: "File Sources", icon: HardDrive },
  { name: "AI Rewrite Modes", icon: Wand2 },
  { name: "About", icon: Info },
];

/**
 * Application settings dialog.
 *
 * Contains sections for theme/appearance, storage options, external file
 * sources, AI rewrite mode customisation, and an About page.
 */
export const Settings = ({
  open,
  onOpenChange,
  initialSection,
  defaultSidebarView = 'last-used',
  onDefaultSidebarViewChange,
  enableDatabaseSync = false,
  onEnableDatabaseSyncChange
}: SettingsProps) => {
  const { theme, setTheme } = useTheme();
  const [activeSection, setActiveSection] = useState(initialSection || "Appearance");

  useEffect(() => {
    if (open) {
      setActiveSection(initialSection || "Appearance");
    }
  }, [open, initialSection]);
  const [rewriteModes, setRewriteModes] = useState<RewriteMode[]>([]);
  const [editingMode, setEditingMode] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<RewriteMode>>({});

  // File sources state
  const [fileSources, setFileSources] = useState<AnyFileSource[]>([]);
  const [editingSource, setEditingSource] = useState<string | null>(null);
  const [sourceForm, setSourceForm] = useState<{
    name: string;
    type: FileSourceType;
    credentials: Partial<SSHCredentials & S3Credentials & R2Credentials & B2Credentials & GoogleDocsCredentials & TursoDBCredentials>;
  }>({
    name: '',
    type: 'local',
    credentials: {},
  });

  useEffect(() => {
    if (open) {
      setRewriteModes(getRewriteModes());
      setFileSources(getFileSources());
    }
  }, [open]);

  const themes = [
    {
      value: 'light',
      label: 'Light',
      icon: <Sun className="h-4 w-4" />,
      description: 'Clean and bright interface',
    },
    {
      value: 'dark',
      label: 'Dark',
      icon: <Moon className="h-4 w-4" />,
      description: 'Easy on the eyes in low light',
    },
    {
      value: 'system',
      label: 'System',
      icon: <Monitor className="h-4 w-4" />,
      description: 'Sync with your system preferences',
    },
  ];

  /**
   * Saves an edited rewrite mode to the list and persists it.
   *
   * @param mode - The fully updated `RewriteMode` object.
   */
  const handleSaveMode = (mode: RewriteMode) => {
    const updatedModes = rewriteModes.map((m) =>
      m.id === mode.id ? mode : m
    );
    setRewriteModes(updatedModes);
    saveRewriteModes(updatedModes);
    setEditingMode(null);
    setEditForm({});
    toast.success('Mode updated');
  };

  /** Creates a new rewrite mode from the current `editForm` values and persists it. */
  const handleAddMode = () => {
    const newMode: RewriteMode = {
      id: `custom-${Date.now()}`,
      name: editForm.name || 'New Mode',
      prompt: editForm.prompt || 'Rewrite this text:',
      color: editForm.color || 'blue',
    };
    const updatedModes = [...rewriteModes, newMode];
    setRewriteModes(updatedModes);
    saveRewriteModes(updatedModes);
    setEditingMode(null);
    setEditForm({});
    toast.success('Mode added');
  };

  /**
   * Removes a rewrite mode from the list and persists the change.
   *
   * @param id - ID of the mode to delete.
   */
  const handleDeleteMode = (id: string) => {
    const updatedModes = rewriteModes.filter((m) => m.id !== id);
    setRewriteModes(updatedModes);
    saveRewriteModes(updatedModes);
    toast.success('Mode deleted');
  };

  /** Resets all rewrite modes to the built-in defaults. */
  const handleResetModes = () => {
    resetRewriteModes();
    setRewriteModes(getRewriteModes());
    toast.success('Modes reset to defaults');
  };

  /**
   * Begins editing a rewrite mode by setting `editingMode` and pre-populating
   * `editForm` with the mode's current values.
   *
   * @param mode - The mode to begin editing.
   */
  const startEditing = (mode: RewriteMode) => {
    setEditingMode(mode.id);
    setEditForm(mode);
  };

  /** Cancels the active edit without saving changes. */
  const cancelEditing = () => {
    setEditingMode(null);
    setEditForm({});
  };

  /**
   * Saves a file source (creates or updates) using `sourceForm` values and
   * refreshes the file sources list.
   */
  const handleSaveSource = () => {
    if (!sourceForm.name.trim()) {
      toast.error('Please enter a source name');
      return;
    }

    if (editingSource && editingSource !== 'new') {
      // Update existing source
      const source = fileSources.find((s) => s.id === editingSource);
      if (source) {
        updateFileSource(editingSource, {
          name: sourceForm.name,
          credentials: sourceForm.type !== 'local' ? sourceForm.credentials : undefined,
        } as Partial<AnyFileSource>);
        setFileSources(getFileSources());
        toast.success('Source updated');
      }
    } else {
      // Add new source
      addFileSource({
        name: sourceForm.name,
        type: sourceForm.type,
        credentials: sourceForm.type !== 'local' ? sourceForm.credentials : undefined,
      } as any);
      setFileSources(getFileSources());
      toast.success('Source added');
    }

    setEditingSource(null);
    setSourceForm({ name: '', type: 'local', credentials: {} });
  };

  /**
   * Deletes a file source by ID and refreshes the list.
   *
   * @param id - ID of the source to remove.
   */
  const handleDeleteSource = (id: string) => {
    deleteFileSource(id);
    setFileSources(getFileSources());
    toast.success('Source deleted');
  };

  /**
   * Begins editing an existing file source by pre-populating `sourceForm`.
   *
   * @param source - The file source to edit.
   */
  const startEditingSource = (source: AnyFileSource) => {
    setEditingSource(source.id);
    setSourceForm({
      name: source.name,
      type: source.type,
      credentials: source.credentials || {},
    });
  };

  /** Cancels the active source edit and resets `sourceForm`. */
  const cancelEditingSource = () => {
    setEditingSource(null);
    setSourceForm({ name: '', type: 'local', credentials: {} });
  };

  /**
   * Returns the JSX for the currently active settings section.
   * Switches on `activeSection` to render one of:
   * Appearance, Storage, File Sources, AI Rewrite Modes, or About.
   *
   * @returns The section content element.
   */
  const renderContent = () => {
    switch (activeSection) {
      case "Appearance":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-2">Appearance</h2>
              <p className="text-sm text-muted-foreground">
                Choose how REASON looks to you
              </p>
            </div>

            <Separator />

            <div className="space-y-4">
              <Label className="text-base">Theme</Label>
              <RadioGroup
                value={theme}
                onValueChange={setTheme}
                className="space-y-3"
              >
                {themes.map((themeOption) => (
                  <div
                    key={themeOption.value}
                    className="flex items-start space-x-3"
                  >
                    <RadioGroupItem
                      value={themeOption.value}
                      id={themeOption.value}
                      className="mt-1"
                    />
                    <label
                      htmlFor={themeOption.value}
                      className="flex-1 cursor-pointer"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div className="text-muted-foreground">
                          {themeOption.icon}
                        </div>
                        <span className="font-medium">{themeOption.label}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {themeOption.description}
                      </p>
                    </label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-4">
              <Label className="text-base">Color Theme</Label>
              <p className="text-sm text-muted-foreground mb-2">
                Choose from various color themes to customize your interface
              </p>
              <div className="flex items-center">
                <ThemeDropdown />
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <Label className="text-base">Default Sidebar View</Label>
              <p className="text-sm text-muted-foreground mb-2">
                Choose the default view when opening the application
              </p>
              <RadioGroup
                value={defaultSidebarView}
                onValueChange={(value) => onDefaultSidebarViewChange?.(value as 'tree' | 'outline' | 'split' | 'last-used')}
                className="space-y-3"
              >
                <div className="flex items-start space-x-3">
                  <RadioGroupItem value="tree" id="tree" className="mt-1" />
                  <label htmlFor="tree" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">Documents Tree</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Show only the document tree
                    </p>
                  </label>
                </div>
                <div className="flex items-start space-x-3">
                  <RadioGroupItem value="outline" id="outline" className="mt-1" />
                  <label htmlFor="outline" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">Outline Only</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Show only the headings outline
                    </p>
                  </label>
                </div>
                <div className="flex items-start space-x-3">
                  <RadioGroupItem value="split" id="split" className="mt-1" />
                  <label htmlFor="split" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">Split View</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Show both tree and outline side by side
                    </p>
                  </label>
                </div>
                <div className="flex items-start space-x-3">
                  <RadioGroupItem value="last-used" id="last-used" className="mt-1" />
                  <label htmlFor="last-used" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">Remember Last Used</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Use the view you had open last time
                    </p>
                  </label>
                </div>
              </RadioGroup>
            </div>
          </div>
        );

      case "Storage":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-2">Storage</h2>
              <p className="text-sm text-muted-foreground">
                Manage how your documents are stored
              </p>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <Label className="text-base flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    Database Sync
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Save documents to SQL database for persistent storage
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="database-sync"
                    checked={enableDatabaseSync}
                    onChange={(e) => onEnableDatabaseSyncChange?.(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                </div>
              </div>

              {enableDatabaseSync && (
                <div className="rounded-md bg-muted p-3 space-y-2">
                  <div className="flex items-start gap-2">
                    <Info className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Database Sync Enabled</p>
                      <p className="text-xs text-muted-foreground">
                        Your documents will be automatically saved to the database. Changes are synced every 2 seconds after editing.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {!enableDatabaseSync && (
                <div className="rounded-md bg-muted p-3 space-y-2">
                  <div className="flex items-start gap-2">
                    <HardDrive className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Local Storage Only</p>
                      <p className="text-xs text-muted-foreground">
                        Your documents are stored in your browser's local storage. They won't be accessible from other devices.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case "File Sources":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-2">File Sources</h2>
              <p className="text-sm text-muted-foreground">
                Manage storage sources (SSH, S3, R2, B2, Google Docs, Turso DB)
              </p>
            </div>

            <Separator />

            <div className="space-y-3">
              {fileSources.map((source) => (
                <div
                  key={source.id}
                  className="border rounded-lg p-3 space-y-2"
                >
                  {editingSource === source.id ? (
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label htmlFor={`source-name-${source.id}`}>Source Name</Label>
                        <Input
                          id={`source-name-${source.id}`}
                          value={sourceForm.name}
                          onChange={(e) =>
                            setSourceForm({ ...sourceForm, name: e.target.value })
                          }
                          placeholder="My Remote Files"
                        />
                      </div>

                      {source.type === 'ssh' && (
                        <>
                          <div className="space-y-2">
                            <Label>Host</Label>
                            <Input
                              value={((sourceForm.credentials as SSHCredentials)?.host) || ''}
                              onChange={(e) =>
                                setSourceForm({
                                  ...sourceForm,
                                  credentials: { ...sourceForm.credentials, host: e.target.value },
                                })
                              }
                              placeholder="example.com"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-2">
                              <Label>Port</Label>
                              <Input
                                type="number"
                                value={((sourceForm.credentials as SSHCredentials)?.port) || 22}
                                onChange={(e) =>
                                  setSourceForm({
                                    ...sourceForm,
                                    credentials: { ...sourceForm.credentials, port: parseInt(e.target.value) },
                                  })
                                }
                                placeholder="22"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Username</Label>
                              <Input
                                value={((sourceForm.credentials as SSHCredentials)?.username) || ''}
                                onChange={(e) =>
                                  setSourceForm({
                                    ...sourceForm,
                                    credentials: { ...sourceForm.credentials, username: e.target.value },
                                  })
                                }
                                placeholder="user"
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label>Password (Optional)</Label>
                            <Input
                              type="password"
                              value={((sourceForm.credentials as SSHCredentials)?.password) || ''}
                              onChange={(e) =>
                                setSourceForm({
                                  ...sourceForm,
                                  credentials: { ...sourceForm.credentials, password: e.target.value },
                                })
                              }
                              placeholder="••••••••"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Base Path (Optional)</Label>
                            <Input
                              value={((sourceForm.credentials as SSHCredentials)?.basePath) || ''}
                              onChange={(e) =>
                                setSourceForm({
                                  ...sourceForm,
                                  credentials: { ...sourceForm.credentials, basePath: e.target.value },
                                })
                              }
                              placeholder="/home/user/documents"
                            />
                          </div>
                        </>
                      )}

                      {source.type === 's3' && (
                        <>
                          <div className="space-y-2">
                            <Label>Access Key ID</Label>
                            <Input
                              value={((sourceForm.credentials as S3Credentials)?.accessKeyId) || ''}
                              onChange={(e) =>
                                setSourceForm({
                                  ...sourceForm,
                                  credentials: { ...sourceForm.credentials, accessKeyId: e.target.value },
                                })
                              }
                              placeholder="AKIAIOSFODNN7EXAMPLE"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Secret Access Key</Label>
                            <Input
                              type="password"
                              value={((sourceForm.credentials as S3Credentials)?.secretAccessKey) || ''}
                              onChange={(e) =>
                                setSourceForm({
                                  ...sourceForm,
                                  credentials: { ...sourceForm.credentials, secretAccessKey: e.target.value },
                                })
                              }
                              placeholder="••••••••"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-2">
                              <Label>Region</Label>
                              <Input
                                value={((sourceForm.credentials as S3Credentials)?.region) || ''}
                                onChange={(e) =>
                                  setSourceForm({
                                    ...sourceForm,
                                    credentials: { ...sourceForm.credentials, region: e.target.value },
                                  })
                                }
                                placeholder="us-east-1"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Bucket</Label>
                              <Input
                                value={((sourceForm.credentials as S3Credentials)?.bucket) || ''}
                                onChange={(e) =>
                                  setSourceForm({
                                    ...sourceForm,
                                    credentials: { ...sourceForm.credentials, bucket: e.target.value },
                                  })
                                }
                                placeholder="my-bucket"
                              />
                            </div>
                          </div>
                        </>
                      )}

                      {source.type === 'r2' && (
                        <>
                          <div className="space-y-2">
                            <Label>Account ID</Label>
                            <Input
                              value={((sourceForm.credentials as R2Credentials)?.accountId) || ''}
                              onChange={(e) =>
                                setSourceForm({
                                  ...sourceForm,
                                  credentials: { ...sourceForm.credentials, accountId: e.target.value },
                                })
                              }
                              placeholder="your-account-id"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Access Key ID</Label>
                            <Input
                              value={((sourceForm.credentials as R2Credentials)?.accessKeyId) || ''}
                              onChange={(e) =>
                                setSourceForm({
                                  ...sourceForm,
                                  credentials: { ...sourceForm.credentials, accessKeyId: e.target.value },
                                })
                              }
                              placeholder="your-access-key-id"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Secret Access Key</Label>
                            <Input
                              type="password"
                              value={((sourceForm.credentials as R2Credentials)?.secretAccessKey) || ''}
                              onChange={(e) =>
                                setSourceForm({
                                  ...sourceForm,
                                  credentials: { ...sourceForm.credentials, secretAccessKey: e.target.value },
                                })
                              }
                              placeholder="••••••••"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Bucket</Label>
                            <Input
                              value={((sourceForm.credentials as R2Credentials)?.bucket) || ''}
                              onChange={(e) =>
                                setSourceForm({
                                  ...sourceForm,
                                  credentials: { ...sourceForm.credentials, bucket: e.target.value },
                                })
                              }
                              placeholder="my-bucket"
                            />
                          </div>
                        </>
                      )}

                      {source.type === 'b2' && (
                        <>
                          <div className="space-y-2">
                            <Label>Access Key ID</Label>
                            <Input
                              value={((sourceForm.credentials as B2Credentials)?.accessKeyId) || ''}
                              onChange={(e) =>
                                setSourceForm({
                                  ...sourceForm,
                                  credentials: { ...sourceForm.credentials, accessKeyId: e.target.value },
                                })
                              }
                              placeholder="your-key-id"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Secret Access Key</Label>
                            <Input
                              type="password"
                              value={((sourceForm.credentials as B2Credentials)?.secretAccessKey) || ''}
                              onChange={(e) =>
                                setSourceForm({
                                  ...sourceForm,
                                  credentials: { ...sourceForm.credentials, secretAccessKey: e.target.value },
                                })
                              }
                              placeholder="••••••••"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Bucket</Label>
                            <Input
                              value={((sourceForm.credentials as B2Credentials)?.bucket) || ''}
                              onChange={(e) =>
                                setSourceForm({
                                  ...sourceForm,
                                  credentials: { ...sourceForm.credentials, bucket: e.target.value },
                                })
                              }
                              placeholder="my-bucket"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Endpoint (Optional)</Label>
                            <Input
                              value={((sourceForm.credentials as B2Credentials)?.endpoint) || ''}
                              onChange={(e) =>
                                setSourceForm({
                                  ...sourceForm,
                                  credentials: { ...sourceForm.credentials, endpoint: e.target.value },
                                })
                              }
                              placeholder="https://s3.us-west-004.backblazeb2.com"
                            />
                          </div>
                        </>
                      )}

                      {source.type === 'gdocs' && (
                        <>
                          <div className="space-y-2">
                            <Label>Email</Label>
                            <Input
                              value={((sourceForm.credentials as GoogleDocsCredentials)?.email) || ''}
                              onChange={(e) =>
                                setSourceForm({
                                  ...sourceForm,
                                  credentials: { ...sourceForm.credentials, email: e.target.value },
                                })
                              }
                              placeholder="user@gmail.com"
                              disabled
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Folder IDs (comma-separated)</Label>
                            <Textarea
                              value={((sourceForm.credentials as GoogleDocsCredentials)?.folderIds)?.join(', ') || ''}
                              onChange={(e) =>
                                setSourceForm({
                                  ...sourceForm,
                                  credentials: {
                                    ...sourceForm.credentials,
                                    folderIds: e.target.value.split(',').map(id => id.trim()).filter(Boolean)
                                  },
                                })
                              }
                              placeholder="folder-id-1, folder-id-2"
                              rows={3}
                            />
                            <p className="text-xs text-muted-foreground">
                              Enter Google Drive folder IDs to sync (one per line or comma-separated)
                            </p>
                          </div>
                          <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                            <div className="flex-1">
                              <p className="text-sm font-medium">
                                {((sourceForm.credentials as GoogleDocsCredentials)?.isAuthenticated)
                                  ? 'Connected to Google'
                                  : 'Not authenticated'}
                              </p>
                            </div>
                            <Button size="sm" variant="outline">
                              <LogIn className="h-4 w-4 mr-2" />
                              {((sourceForm.credentials as GoogleDocsCredentials)?.isAuthenticated)
                                ? 'Reconnect'
                                : 'Authenticate'}
                            </Button>
                          </div>
                        </>
                      )}

                      {source.type === 'turso' && (
                        <>
                          <div className="space-y-2">
                            <Label>Database Endpoint</Label>
                            <Input
                              value={((sourceForm.credentials as TursoDBCredentials)?.endpoint) || ''}
                              onChange={(e) =>
                                setSourceForm({
                                  ...sourceForm,
                                  credentials: { ...sourceForm.credentials, endpoint: e.target.value },
                                })
                              }
                              placeholder="https://your-db.turso.io"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Auth Token (Optional)</Label>
                            <Input
                              type="password"
                              value={((sourceForm.credentials as TursoDBCredentials)?.authToken) || ''}
                              onChange={(e) =>
                                setSourceForm({
                                  ...sourceForm,
                                  credentials: { ...sourceForm.credentials, authToken: e.target.value },
                                })
                              }
                              placeholder="••••••••"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Database Name (Optional)</Label>
                            <Input
                              value={((sourceForm.credentials as TursoDBCredentials)?.database) || ''}
                              onChange={(e) =>
                                setSourceForm({
                                  ...sourceForm,
                                  credentials: { ...sourceForm.credentials, database: e.target.value },
                                })
                              }
                              placeholder="my-database"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id="enable-gdocs-sync"
                              checked={((sourceForm.credentials as TursoDBCredentials)?.enableGoogleDocsSync) || false}
                              onChange={(e) =>
                                setSourceForm({
                                  ...sourceForm,
                                  credentials: { ...sourceForm.credentials, enableGoogleDocsSync: e.target.checked },
                                })
                              }
                              className="h-4 w-4"
                            />
                            <Label htmlFor="enable-gdocs-sync" className="cursor-pointer">
                              Enable Google Docs Sync
                            </Label>
                          </div>
                          {((sourceForm.credentials as TursoDBCredentials)?.enableGoogleDocsSync) && (
                            <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                              <div className="flex-1">
                                <p className="text-sm">Authenticate with Google to sync documents</p>
                              </div>
                              <Button size="sm" variant="outline">
                                <LogIn className="h-4 w-4 mr-2" />
                                Login with Google
                              </Button>
                            </div>
                          )}
                        </>
                      )}

                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleSaveSource}>
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={cancelEditingSource}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {source.type === 'local' && <HardDrive className="h-4 w-4" />}
                          {source.type === 'ssh' && <Server className="h-4 w-4" />}
                          {source.type === 's3' && <Cloud className="h-4 w-4" />}
                          {source.type === 'r2' && <Database className="h-4 w-4" />}
                          {source.type === 'b2' && <Cloud className="h-4 w-4" />}
                          {source.type === 'gdocs' && <FileText className="h-4 w-4" />}
                          {source.type === 'turso' && <Workflow className="h-4 w-4" />}
                          <span className="font-medium">{source.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {source.type === 'gdocs' ? 'Google Docs' : source.type === 'turso' ? 'Turso DB' : source.type === 'b2' ? 'Backblaze B2' : source.type.toUpperCase()}
                          </Badge>
                        </div>
                        {source.id !== 'local-default' && (
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => startEditingSource(source)}
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-destructive"
                              onClick={() => handleDeleteSource(source.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                      {source.type === 'ssh' && source.credentials && (
                        <p className="text-xs text-muted-foreground">
                          {(source.credentials as SSHCredentials).username}@
                          {(source.credentials as SSHCredentials).host}:
                          {(source.credentials as SSHCredentials).port || 22}
                        </p>
                      )}
                      {source.type === 's3' && source.credentials && (
                        <p className="text-xs text-muted-foreground">
                          {(source.credentials as S3Credentials).bucket} ({(source.credentials as S3Credentials).region})
                        </p>
                      )}
                      {source.type === 'r2' && source.credentials && (
                        <p className="text-xs text-muted-foreground">
                          {(source.credentials as R2Credentials).bucket}
                        </p>
                      )}
                      {source.type === 'b2' && source.credentials && (
                        <p className="text-xs text-muted-foreground">
                          {(source.credentials as B2Credentials).bucket} ({(source.credentials as B2Credentials).endpoint || 'default endpoint'})
                        </p>
                      )}
                      {source.type === 'gdocs' && source.credentials && (
                        <p className="text-xs text-muted-foreground">
                          {(source.credentials as GoogleDocsCredentials).isAuthenticated
                            ? `${(source.credentials as GoogleDocsCredentials).email || 'Authenticated'} - ${(source.credentials as GoogleDocsCredentials).folderIds?.length || 0} folder(s)`
                            : 'Not authenticated'}
                        </p>
                      )}
                      {source.type === 'turso' && source.credentials && (
                        <p className="text-xs text-muted-foreground">
                          {(source.credentials as TursoDBCredentials).endpoint}
                          {(source.credentials as TursoDBCredentials).enableGoogleDocsSync && ' (Google Docs sync enabled)'}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {editingSource === 'new' && (
                <div className="border rounded-lg p-3 space-y-3">
                  <div className="space-y-2">
                    <Label>Source Name</Label>
                    <Input
                      value={sourceForm.name}
                      onChange={(e) =>
                        setSourceForm({ ...sourceForm, name: e.target.value })
                      }
                      placeholder="My Remote Files"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Source Type</Label>
                    <select
                      value={sourceForm.type}
                      onChange={(e) => {
                        const newType = e.target.value as FileSourceType;
                        setSourceForm({ ...sourceForm, type: newType, credentials: newType === 'gdocs' ? { isAuthenticated: false } : {} });
                      }}
                      className="w-full border rounded-md px-3 py-2 text-sm"
                    >
                      <option value="ssh">SSH</option>
                      <option value="s3">Amazon S3</option>
                      <option value="r2">Cloudflare R2</option>
                      <option value="b2">Backblaze B2</option>
                      <option value="gdocs">Google Docs</option>
                      <option value="turso">Turso DB</option>
                    </select>
                  </div>

                  {sourceForm.type === 'ssh' && (
                    <>
                      <div className="space-y-2">
                        <Label>Host</Label>
                        <Input
                          value={((sourceForm.credentials as SSHCredentials)?.host) || ''}
                          onChange={(e) =>
                            setSourceForm({
                              ...sourceForm,
                              credentials: { ...sourceForm.credentials, host: e.target.value },
                            })
                          }
                          placeholder="example.com"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-2">
                          <Label>Port</Label>
                          <Input
                            type="number"
                            value={((sourceForm.credentials as SSHCredentials)?.port) || 22}
                            onChange={(e) =>
                              setSourceForm({
                                ...sourceForm,
                                credentials: { ...sourceForm.credentials, port: parseInt(e.target.value) },
                              })
                            }
                            placeholder="22"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Username</Label>
                          <Input
                            value={((sourceForm.credentials as SSHCredentials)?.username) || ''}
                            onChange={(e) =>
                              setSourceForm({
                                ...sourceForm,
                                credentials: { ...sourceForm.credentials, username: e.target.value },
                              })
                            }
                            placeholder="user"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Password (Optional)</Label>
                        <Input
                          type="password"
                          value={((sourceForm.credentials as SSHCredentials)?.password) || ''}
                          onChange={(e) =>
                            setSourceForm({
                              ...sourceForm,
                              credentials: { ...sourceForm.credentials, password: e.target.value },
                            })
                          }
                          placeholder="••••••••"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Base Path (Optional)</Label>
                        <Input
                          value={((sourceForm.credentials as SSHCredentials)?.basePath) || ''}
                          onChange={(e) =>
                            setSourceForm({
                              ...sourceForm,
                              credentials: { ...sourceForm.credentials, basePath: e.target.value },
                            })
                          }
                          placeholder="/home/user/documents"
                        />
                      </div>
                    </>
                  )}

                  {sourceForm.type === 's3' && (
                    <>
                      <div className="space-y-2">
                        <Label>Access Key ID</Label>
                        <Input
                          value={((sourceForm.credentials as S3Credentials)?.accessKeyId) || ''}
                          onChange={(e) =>
                            setSourceForm({
                              ...sourceForm,
                              credentials: { ...sourceForm.credentials, accessKeyId: e.target.value },
                            })
                          }
                          placeholder="AKIAIOSFODNN7EXAMPLE"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Secret Access Key</Label>
                        <Input
                          type="password"
                          value={((sourceForm.credentials as S3Credentials)?.secretAccessKey) || ''}
                          onChange={(e) =>
                            setSourceForm({
                              ...sourceForm,
                              credentials: { ...sourceForm.credentials, secretAccessKey: e.target.value },
                            })
                          }
                          placeholder="••••••••"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-2">
                          <Label>Region</Label>
                          <Input
                            value={((sourceForm.credentials as S3Credentials)?.region) || ''}
                            onChange={(e) =>
                              setSourceForm({
                                ...sourceForm,
                                credentials: { ...sourceForm.credentials, region: e.target.value },
                              })
                            }
                            placeholder="us-east-1"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Bucket</Label>
                          <Input
                            value={((sourceForm.credentials as S3Credentials)?.bucket) || ''}
                            onChange={(e) =>
                              setSourceForm({
                                ...sourceForm,
                                credentials: { ...sourceForm.credentials, bucket: e.target.value },
                              })
                            }
                            placeholder="my-bucket"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {sourceForm.type === 'r2' && (
                    <>
                      <div className="space-y-2">
                        <Label>Account ID</Label>
                        <Input
                          value={((sourceForm.credentials as R2Credentials)?.accountId) || ''}
                          onChange={(e) =>
                            setSourceForm({
                              ...sourceForm,
                              credentials: { ...sourceForm.credentials, accountId: e.target.value },
                            })
                          }
                          placeholder="your-account-id"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Access Key ID</Label>
                        <Input
                          value={((sourceForm.credentials as R2Credentials)?.accessKeyId) || ''}
                          onChange={(e) =>
                            setSourceForm({
                              ...sourceForm,
                              credentials: { ...sourceForm.credentials, accessKeyId: e.target.value },
                            })
                          }
                          placeholder="your-access-key-id"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Secret Access Key</Label>
                        <Input
                          type="password"
                          value={((sourceForm.credentials as R2Credentials)?.secretAccessKey) || ''}
                          onChange={(e) =>
                            setSourceForm({
                              ...sourceForm,
                              credentials: { ...sourceForm.credentials, secretAccessKey: e.target.value },
                            })
                          }
                          placeholder="••••••••"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Bucket</Label>
                        <Input
                          value={((sourceForm.credentials as R2Credentials)?.bucket) || ''}
                          onChange={(e) =>
                            setSourceForm({
                              ...sourceForm,
                              credentials: { ...sourceForm.credentials, bucket: e.target.value },
                            })
                          }
                          placeholder="my-bucket"
                        />
                      </div>
                    </>
                  )}

                  {sourceForm.type === 'b2' && (
                    <>
                      <div className="space-y-2">
                        <Label>Access Key ID</Label>
                        <Input
                          value={((sourceForm.credentials as B2Credentials)?.accessKeyId) || ''}
                          onChange={(e) =>
                            setSourceForm({
                              ...sourceForm,
                              credentials: { ...sourceForm.credentials, accessKeyId: e.target.value },
                            })
                          }
                          placeholder="your-key-id"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Secret Access Key</Label>
                        <Input
                          type="password"
                          value={((sourceForm.credentials as B2Credentials)?.secretAccessKey) || ''}
                          onChange={(e) =>
                            setSourceForm({
                              ...sourceForm,
                              credentials: { ...sourceForm.credentials, secretAccessKey: e.target.value },
                            })
                          }
                          placeholder="••••••••"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Bucket</Label>
                        <Input
                          value={((sourceForm.credentials as B2Credentials)?.bucket) || ''}
                          onChange={(e) =>
                            setSourceForm({
                              ...sourceForm,
                              credentials: { ...sourceForm.credentials, bucket: e.target.value },
                            })
                          }
                          placeholder="my-bucket"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Endpoint (Optional)</Label>
                        <Input
                          value={((sourceForm.credentials as B2Credentials)?.endpoint) || ''}
                          onChange={(e) =>
                            setSourceForm({
                              ...sourceForm,
                              credentials: { ...sourceForm.credentials, endpoint: e.target.value },
                            })
                          }
                          placeholder="https://s3.us-west-004.backblazeb2.com"
                        />
                      </div>
                    </>
                  )}

                  {sourceForm.type === 'gdocs' && (
                    <>
                      <div className="space-y-2">
                        <Label>Email</Label>
                        <Input
                          value={((sourceForm.credentials as GoogleDocsCredentials)?.email) || ''}
                          onChange={(e) =>
                            setSourceForm({
                              ...sourceForm,
                              credentials: { ...sourceForm.credentials, email: e.target.value },
                            })
                          }
                          placeholder="user@gmail.com"
                          disabled
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Folder IDs (comma-separated)</Label>
                        <Textarea
                          value={((sourceForm.credentials as GoogleDocsCredentials)?.folderIds)?.join(', ') || ''}
                          onChange={(e) =>
                            setSourceForm({
                              ...sourceForm,
                              credentials: {
                                ...sourceForm.credentials,
                                folderIds: e.target.value.split(',').map(id => id.trim()).filter(Boolean)
                              },
                            })
                          }
                          placeholder="folder-id-1, folder-id-2"
                          rows={3}
                        />
                        <p className="text-xs text-muted-foreground">
                          Enter Google Drive folder IDs to sync (one per line or comma-separated)
                        </p>
                      </div>
                      <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                        <div className="flex-1">
                          <p className="text-sm font-medium">
                            {((sourceForm.credentials as GoogleDocsCredentials)?.isAuthenticated)
                              ? 'Connected to Google'
                              : 'Not authenticated'}
                          </p>
                        </div>
                        <Button size="sm" variant="outline">
                          <LogIn className="h-4 w-4 mr-2" />
                          {((sourceForm.credentials as GoogleDocsCredentials)?.isAuthenticated)
                            ? 'Reconnect'
                            : 'Authenticate'}
                        </Button>
                      </div>
                    </>
                  )}

                  {sourceForm.type === 'turso' && (
                    <>
                      <div className="space-y-2">
                        <Label>Database Endpoint</Label>
                        <Input
                          value={((sourceForm.credentials as TursoDBCredentials)?.endpoint) || ''}
                          onChange={(e) =>
                            setSourceForm({
                              ...sourceForm,
                              credentials: { ...sourceForm.credentials, endpoint: e.target.value },
                            })
                          }
                          placeholder="https://your-db.turso.io"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Auth Token (Optional)</Label>
                        <Input
                          type="password"
                          value={((sourceForm.credentials as TursoDBCredentials)?.authToken) || ''}
                          onChange={(e) =>
                            setSourceForm({
                              ...sourceForm,
                              credentials: { ...sourceForm.credentials, authToken: e.target.value },
                            })
                          }
                          placeholder="••••••••"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Database Name (Optional)</Label>
                        <Input
                          value={((sourceForm.credentials as TursoDBCredentials)?.database) || ''}
                          onChange={(e) =>
                            setSourceForm({
                              ...sourceForm,
                              credentials: { ...sourceForm.credentials, database: e.target.value },
                            })
                          }
                          placeholder="my-database"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="enable-gdocs-sync-new"
                          checked={((sourceForm.credentials as TursoDBCredentials)?.enableGoogleDocsSync) || false}
                          onChange={(e) =>
                            setSourceForm({
                              ...sourceForm,
                              credentials: { ...sourceForm.credentials, enableGoogleDocsSync: e.target.checked },
                            })
                          }
                          className="h-4 w-4"
                        />
                        <Label htmlFor="enable-gdocs-sync-new" className="cursor-pointer">
                          Enable Google Docs Sync
                        </Label>
                      </div>
                      {((sourceForm.credentials as TursoDBCredentials)?.enableGoogleDocsSync) && (
                        <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                          <div className="flex-1">
                            <p className="text-sm">Authenticate with Google to sync documents</p>
                          </div>
                          <Button size="sm" variant="outline">
                            <LogIn className="h-4 w-4 mr-2" />
                            Login with Google
                          </Button>
                        </div>
                      )}
                    </>
                  )}

                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveSource}>
                      Add Source
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={cancelEditingSource}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {editingSource !== 'new' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditingSource('new');
                  setSourceForm({ name: '', type: 'ssh', credentials: { port: 22 } });
                }}
                className="w-full gap-2"
              >
                <Plus className="h-4 w-4" />
                Add New File Source
              </Button>
            )}
          </div>
        );

      case "AI Rewrite Modes":
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold mb-2">AI Rewrite Modes</h2>
                <p className="text-sm text-muted-foreground">
                  Customize AI rewrite prompts and add your own modes
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetModes}
                className="gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Reset
              </Button>
            </div>

            <Separator />

            <div className="space-y-3">
              {rewriteModes.map((mode) => (
                <div
                  key={mode.id}
                  className="border rounded-lg p-3 space-y-2"
                >
                  {editingMode === mode.id ? (
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label htmlFor={`name-${mode.id}`}>Mode Name</Label>
                        <Input
                          id={`name-${mode.id}`}
                          value={editForm.name || ''}
                          onChange={(e) =>
                            setEditForm({ ...editForm, name: e.target.value })
                          }
                          placeholder="Mode name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`prompt-${mode.id}`}>Prompt</Label>
                        <Textarea
                          id={`prompt-${mode.id}`}
                          value={editForm.prompt || ''}
                          onChange={(e) =>
                            setEditForm({ ...editForm, prompt: e.target.value })
                          }
                          placeholder="Rewrite prompt..."
                          rows={4}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`color-${mode.id}`}>Color</Label>
                        <select
                          id={`color-${mode.id}`}
                          value={editForm.color || 'blue'}
                          onChange={(e) =>
                            setEditForm({ ...editForm, color: e.target.value })
                          }
                          className="w-full border rounded-md px-3 py-2 text-sm"
                        >
                          <option value="blue">Blue</option>
                          <option value="purple">Purple</option>
                          <option value="green">Green</option>
                          <option value="orange">Orange</option>
                          <option value="pink">Pink</option>
                        </select>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleSaveMode(editForm as RewriteMode)}
                        >
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={cancelEditing}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-sm">
                          {mode.name}
                        </Badge>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => startEditing(mode)}
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-destructive"
                            onClick={() => handleDeleteMode(mode.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {mode.prompt}
                      </p>
                    </div>
                  )}
                </div>
              ))}

              {editingMode === 'new' && (
                <div className="border rounded-lg p-3 space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="new-name">Mode Name</Label>
                    <Input
                      id="new-name"
                      value={editForm.name || ''}
                      onChange={(e) =>
                        setEditForm({ ...editForm, name: e.target.value })
                      }
                      placeholder="Mode name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-prompt">Prompt</Label>
                    <Textarea
                      id="new-prompt"
                      value={editForm.prompt || ''}
                      onChange={(e) =>
                        setEditForm({ ...editForm, prompt: e.target.value })
                      }
                      placeholder="Rewrite prompt..."
                      rows={4}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-color">Color</Label>
                    <select
                      id="new-color"
                      value={editForm.color || 'blue'}
                      onChange={(e) =>
                        setEditForm({ ...editForm, color: e.target.value })
                      }
                      className="w-full border rounded-md px-3 py-2 text-sm"
                    >
                      <option value="blue">Blue</option>
                      <option value="purple">Purple</option>
                      <option value="green">Green</option>
                      <option value="orange">Orange</option>
                      <option value="pink">Pink</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleAddMode}>
                      Add Mode
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={cancelEditing}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {editingMode !== 'new' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditingMode('new');
                  setEditForm({ name: '', prompt: '', color: 'blue' });
                }}
                className="w-full gap-2"
              >
                <Plus className="h-4 w-4" />
                Add New Mode
              </Button>
            )}
          </div>
        );

      case "About":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-2">About</h2>
              <p className="text-sm text-muted-foreground">
                Application information
              </p>
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

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0 md:max-h-[500px] md:max-w-[700px] lg:max-w-[800px]">
        <DialogTitle className="sr-only">Settings</DialogTitle>
        <DialogDescription className="sr-only">
          Customize your settings here.
        </DialogDescription>
        <SidebarProvider className="items-start">
          <Sidebar collapsible="none" className="hidden md:flex">
            <SidebarContent>
              <SidebarGroup>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {settingsNav.map((item) => (
                      <SidebarMenuItem key={item.name}>
                        <SidebarMenuButton
                          asChild
                          isActive={item.name === activeSection}
                          onClick={() => setActiveSection(item.name)}
                        >
                          <a href="#">
                            <item.icon />
                            <span>{item.name}</span>
                          </a>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>
          </Sidebar>
          <main className="flex h-[480px] flex-1 flex-col overflow-hidden">
            <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
              <div className="flex items-center gap-2 px-4">
                <Breadcrumb>
                  <BreadcrumbList>
                    <BreadcrumbItem className="hidden md:block">
                      <BreadcrumbLink href="#">
                        <SettingsIcon className="h-4 w-4 inline mr-1" />
                        Settings
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator className="hidden md:block" />
                    <BreadcrumbItem>
                      <BreadcrumbPage>{activeSection}</BreadcrumbPage>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>
              </div>
            </header>
            <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 pt-0">
              {renderContent()}
            </div>
          </main>
        </SidebarProvider>
      </DialogContent>
    </Dialog>
  );
};
