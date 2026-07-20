'use client';

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Loader2, Brain, Zap, AlertCircle, Plus, Edit2, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MemoryEntry {
  id: string;
  name: string;
  type: 'user' | 'feedback' | 'project' | 'reference';
  description: string;
  lastUpdated: string;
  content: string;
  tags?: string[];
  importance: number;
  accessCount?: number;
}

interface Skill {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  category: string;
  lastUsed?: string;
}

const SKILL_CATEGORIES = {
  'Information Retrieval': [
    { id: 'web-search', name: 'Web Search', description: 'Search across the internet in real-time' },
    { id: 'document-fetch', name: 'Document Fetching', description: 'Retrieve and analyze web content' },
    { id: 'pdf-analysis', name: 'PDF Analysis', description: 'Extract and understand PDF documents' },
  ],
  'Code & Development': [
    { id: 'code-analysis', name: 'Code Analysis', description: 'Analyze and understand codebases' },
    { id: 'git-integration', name: 'Git Integration', description: 'Access repository history and changes' },
    { id: 'deployment', name: 'Deployment Tools', description: 'Deploy and manage applications' },
  ],
  'Data Processing': [
    { id: 'data-extraction', name: 'Data Extraction', description: 'Extract structured data from content' },
    { id: 'csv-processing', name: 'CSV Processing', description: 'Parse and analyze CSV files' },
    { id: 'data-visualization', name: 'Data Visualization', description: 'Create charts and visualizations' },
  ],
  'Knowledge Management': [
    { id: 'memory-recall', name: 'Memory Recall', description: 'Access your stored memories and context' },
    { id: 'context-synthesis', name: 'Context Synthesis', description: 'Synthesize information across memories' },
    { id: 'fact-extraction', name: 'Fact Extraction', description: 'Extract and store key facts' },
  ],
};

const MEMORY_TYPE_COLORS = {
  user: { bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', label: 'User Profile' },
  feedback: { bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', label: 'Feedback' },
  project: { bg: 'bg-purple-500/10', text: 'text-purple-600 dark:text-purple-400', label: 'Project' },
  reference: { bg: 'bg-green-500/10', text: 'text-green-600 dark:text-green-400', label: 'Reference' },
};

const SectionCard = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <section className={cn('rounded-xl border border-light-200 bg-secondary/50 p-4 lg:p-6 transition-colors dark:border-dark-200 dark:bg-dark-primary/80', className)}>
    {children}
  </section>
);

const SectionTitle = ({ title, subtitle }: { title: string; subtitle?: string }) => (
  <div className="mb-4">
    <h4 className="text-sm text-black dark:text-white font-medium">{title}</h4>
    {subtitle && <p className="text-[11px] lg:text-xs text-black/50 dark:text-white/50">{subtitle}</p>}
  </div>
);

const MemoryBadge = ({ type }: { type: MemoryEntry['type'] }) => {
  const colors = MEMORY_TYPE_COLORS[type];
  return (
    <span className={cn('inline-block px-2 py-1 rounded text-[10px] font-medium', colors.bg, colors.text)}>
      {colors.label}
    </span>
  );
};

const MemoryCard = ({
  memory,
  expanded,
  onToggleExpand,
  onDelete,
  onEdit,
  onUsageUpdate,
}: {
  memory: MemoryEntry;
  expanded: boolean;
  onToggleExpand: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (memory: MemoryEntry) => void;
  onUsageUpdate: (id: string) => void;
}) => (
  <div className="rounded-lg border border-light-200/50 dark:border-dark-200/50 bg-light-primary/50 dark:bg-dark-secondary/30 overflow-hidden transition-colors hover:border-light-200 dark:hover:border-dark-200">
    <button
      onClick={() => onToggleExpand(memory.id)}
      className="w-full text-left p-3 flex items-start justify-between gap-2 hover:bg-light-200/30 dark:hover:bg-dark-300/30"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-xs font-medium text-black dark:text-white truncate">
            {memory.name}
          </p>
          <MemoryBadge type={memory.type} />
          {memory.importance >= 8 && (
            <span className="text-[10px] font-bold text-red-600 dark:text-red-400">★</span>
          )}
        </div>
        <p className="text-[11px] text-black/50 dark:text-white/50 line-clamp-1">
          {memory.description}
        </p>
      </div>
      <div className="flex-shrink-0 text-black/40 dark:text-white/40">
        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </div>
    </button>

    {expanded && (
      <div className="border-t border-light-200/30 dark:border-dark-200/30 p-3 space-y-3">
        <div>
          <p className="text-[10px] font-semibold text-black/60 dark:text-white/60 uppercase tracking-wide mb-1">
            Content
          </p>
          <p className="text-xs text-black/70 dark:text-white/70 bg-light-200/30 dark:bg-dark-300/30 p-2 rounded line-clamp-3">
            {memory.content}
          </p>
        </div>

        {memory.tags && memory.tags.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold text-black/60 dark:text-white/60 uppercase tracking-wide mb-1">
              Tags
            </p>
            <div className="flex flex-wrap gap-1">
              {memory.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-block px-2 py-0.5 rounded text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2 text-[10px] text-black/50 dark:text-white/50">
          <div>
            <span className="font-medium block">Importance</span>
            <span>{memory.importance}/10</span>
          </div>
          <div>
            <span className="font-medium block">Used</span>
            <span>{memory.accessCount || 0} times</span>
          </div>
          <div>
            <span className="font-medium block">Updated</span>
            <span>{new Date(memory.lastUpdated).toLocaleDateString()}</span>
          </div>
        </div>

        <div className="flex gap-2 pt-2 border-t border-light-200/30 dark:border-dark-200/30">
          <button
            onClick={() => onUsageUpdate(memory.id)}
            className="flex-1 px-2 py-1.5 text-[10px] font-medium rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 transition-colors"
          >
            Use Now
          </button>
          <button
            onClick={() => onEdit(memory)}
            className="flex-1 px-2 py-1.5 text-[10px] font-medium rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 transition-colors flex items-center justify-center gap-1"
          >
            <Edit2 className="w-3 h-3" />
            Edit
          </button>
          <button
            onClick={() => onDelete(memory.id)}
            className="flex-1 px-2 py-1.5 text-[10px] font-medium rounded bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20 transition-colors flex items-center justify-center gap-1"
          >
            <Trash2 className="w-3 h-3" />
            Delete
          </button>
        </div>
      </div>
    )}
  </div>
);

export default function SkillsAndMemory() {
  const [memories, setMemories] = useState<MemoryEntry[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [expandedMemories, setExpandedMemories] = useState<Set<string>>(new Set());
  const [expandedSkillCategory, setExpandedSkillCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingSkill, setSavingSkill] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | MemoryEntry['type']>('all');

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch enabled skills
        const skillsRes = await fetch('/api/user/enabled-skills');
        if (skillsRes.ok) {
          const skillsData = await skillsRes.json();
          const skillsMap = new Map<string, boolean>(skillsData.map((s: any) => [s.id, s.enabled]));

          const allSkills: Skill[] = [];
          Object.entries(SKILL_CATEGORIES).forEach(([category, skillList]) => {
            skillList.forEach((skill) => {
              allSkills.push({
                ...skill,
                enabled: skillsMap.get(skill.id) ?? true,
                category,
              });
            });
          });
          setSkills(allSkills);
        }

        // Fetch memories
        const memoriesRes = await fetch('/api/user/memories');
        if (memoriesRes.ok) {
          const memoriesData = await memoriesRes.json();
          setMemories(memoriesData);
        } else {
          // Show mock data for demo
          setMemories([
            {
              id: '1',
              name: 'API Client Usage',
              type: 'reference',
              description: 'Use qwksearch-api-client for API calls',
              content: 'All API calls should use the qwksearch-api-client library instead of direct fetch calls. This ensures consistent error handling and authentication.',
              lastUpdated: new Date(Date.now() - 86400000).toISOString(),
              tags: ['api', 'best-practices'],
              importance: 9,
              accessCount: 5,
            },
            {
              id: '2',
              name: 'Kokoro TTS Integration',
              type: 'project',
              description: 'Client-side text-to-speech fully integrated',
              content: 'Kokoro.js TTS has been integrated into the settings panel with support for voice selection and audio playback controls.',
              lastUpdated: new Date(Date.now() - 172800000).toISOString(),
              tags: ['tts', 'audio', 'kokoro'],
              importance: 8,
              accessCount: 3,
            },
            {
              id: '3',
              name: 'Perplexity Memory Feature',
              type: 'feedback',
              description: 'User prefers memory interface similar to Perplexity',
              content: 'When implementing memory features, take inspiration from Perplexity\'s clean UI with expandable cards, color-coded memory types, and usage statistics.',
              lastUpdated: new Date(Date.now() - 259200000).toISOString(),
              tags: ['ui', 'memory', 'perplexity'],
              importance: 7,
              accessCount: 2,
            },
            {
              id: '4',
              name: 'User Preferences',
              type: 'user',
              description: 'Working on research-agent with focus on memory/skills',
              content: 'User is developing the qwksearch research agent and is currently focusing on implementing comprehensive memory and skills management features with parity to Perplexity.',
              lastUpdated: new Date(Date.now() - 345600000).toISOString(),
              tags: ['profile', 'dev', 'research-agent'],
              importance: 9,
              accessCount: 10,
            },
          ]);
        }
      } catch (err) {
        console.error('Failed to load skills and memory:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSkillToggle = async (skillId: string, enabled: boolean) => {
    setSavingSkill(skillId);
    try {
      const res = await fetch('/api/user/enabled-skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skillId, enabled }),
      });
      if (!res.ok) throw new Error();
      setSkills((prev) =>
        prev.map((s) => (s.id === skillId ? { ...s, enabled } : s))
      );
      toast.success(`Skill ${enabled ? 'enabled' : 'disabled'}`);
    } catch (err) {
      toast.error('Failed to update skill');
    } finally {
      setSavingSkill(null);
    }
  };

  const handleDeleteMemory = async (id: string) => {
    try {
      const res = await fetch(`/api/user/memories/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error();
      setMemories((prev) => prev.filter((m) => m.id !== id));
      toast.success('Memory deleted');
    } catch (err) {
      toast.error('Failed to delete memory');
    }
  };

  const handleMemoryUsage = async (id: string) => {
    try {
      const res = await fetch(`/api/user/memories/${id}/usage`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error();
      setMemories((prev) =>
        prev.map((m) =>
          m.id === id ? { ...m, accessCount: (m.accessCount || 0) + 1 } : m
        )
      );
    } catch (err) {
      console.error('Failed to update memory usage:', err);
    }
  };

  const toggleMemoryExpand = (id: string) => {
    setExpandedMemories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const filteredMemories = memories.filter((m) => {
    const matchesQuery =
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.tags?.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesType = filterType === 'all' || m.type === filterType;
    return matchesQuery && matchesType;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-black/40 dark:text-white/40" />
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 overflow-y-auto px-6 py-6">
      {/* Skills Section */}
      <SectionCard>
        <SectionTitle
          title="Active Skills"
          subtitle="Enable or disable capabilities available to your agent"
        />
        <div className="space-y-4">
          {Object.entries(SKILL_CATEGORIES).map(([category]) => {
            const categorySkills = skills.filter((s) => s.category === category);
            const isExpanded = expandedSkillCategory === category;
            const enabledCount = categorySkills.filter((s) => s.enabled).length;

            return (
              <div key={category}>
                <button
                  onClick={() =>
                    setExpandedSkillCategory(isExpanded ? null : category)
                  }
                  className="w-full flex items-center justify-between px-1 py-2 hover:bg-light-200/20 dark:hover:bg-dark-300/20 rounded transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-black/60 dark:text-white/60 uppercase tracking-wide">
                      {category}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400">
                      {enabledCount}/{categorySkills.length}
                    </span>
                  </div>
                  <ChevronDown
                    className={cn('w-4 h-4 text-black/40 dark:text-white/40 transition-transform', isExpanded && 'rotate-180')}
                  />
                </button>

                {isExpanded && (
                  <div className="space-y-2 mt-2">
                    {categorySkills.map((skill) => (
                      <div
                        key={skill.id}
                        className="flex items-start justify-between gap-3 py-3 px-3 rounded-lg border border-light-200/50 dark:border-dark-200/50 bg-light-primary/50 dark:bg-dark-secondary/30 hover:border-light-200 dark:hover:border-dark-200 transition-colors"
                      >
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="mt-1 p-2 rounded-lg bg-blue-500/10 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex-shrink-0">
                            <Zap className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-black dark:text-white">
                              {skill.name}
                            </p>
                            <p className="text-[11px] text-black/50 dark:text-white/50 mt-0.5">
                              {skill.description}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleSkillToggle(skill.id, !skill.enabled)}
                          disabled={savingSkill === skill.id}
                          className={cn(
                            'flex-shrink-0 w-10 h-6 rounded-full transition-all duration-200 relative',
                            skill.enabled
                              ? 'bg-[#24A0ED]'
                              : 'bg-light-200 dark:bg-dark-300',
                            'disabled:opacity-50 disabled:cursor-not-allowed'
                          )}
                          title={skill.enabled ? 'Disable skill' : 'Enable skill'}
                        >
                          <div
                            className={cn(
                              'absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform duration-200',
                              skill.enabled && 'translate-x-4'
                            )}
                          />
                          {savingSkill === skill.id && (
                            <Loader2 className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 animate-spin text-white" />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </SectionCard>

      {/* Memory Section */}
      <SectionCard>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <SectionTitle
              title="Your Memories"
              subtitle={`${filteredMemories.length} total memories stored`}
            />
            <button className="px-3 py-1.5 text-xs font-medium rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 transition-colors flex items-center gap-1">
              <Plus className="w-3 h-3" />
              New Memory
            </button>
          </div>

          {/* Search and Filter */}
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Search memories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-light-200/50 dark:border-dark-200/50 bg-light-primary dark:bg-dark-primary placeholder-black/40 dark:placeholder-white/40 text-black dark:text-white focus:outline-none focus:border-light-200 dark:focus:border-dark-200"
            />
            <div className="flex gap-2 flex-wrap">
              {(['all', 'user', 'feedback', 'project', 'reference'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={cn(
                    'px-2 py-1 text-[10px] font-medium rounded transition-colors',
                    filterType === type
                      ? 'bg-blue-500 text-white'
                      : 'bg-light-200/50 dark:bg-dark-300/50 text-black/60 dark:text-white/60 hover:bg-light-200 dark:hover:bg-dark-300'
                  )}
                >
                  {type === 'all' ? 'All Types' : MEMORY_TYPE_COLORS[type as MemoryEntry['type']].label}
                </button>
              ))}
            </div>
          </div>

          {/* Memories List */}
          {filteredMemories.length > 0 ? (
            <div className="space-y-2">
              {filteredMemories.map((memory) => (
                <MemoryCard
                  key={memory.id}
                  memory={memory}
                  expanded={expandedMemories.has(memory.id)}
                  onToggleExpand={toggleMemoryExpand}
                  onDelete={handleDeleteMemory}
                  onEdit={() => {}}
                  onUsageUpdate={handleMemoryUsage}
                />
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-500/5 border border-blue-500/20 dark:bg-blue-500/10 dark:border-blue-500/30">
              <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
              <p className="text-xs text-blue-600 dark:text-blue-400">
                {searchQuery || filterType !== 'all'
                  ? 'No memories match your search.'
                  : 'No memories saved yet. Interact with the agent to build your memory profile.'}
              </p>
            </div>
          )}
        </div>
      </SectionCard>

      {/* Stats Section */}
      <SectionCard>
        <SectionTitle title="Memory Statistics" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg bg-light-200/30 dark:bg-dark-300/30">
            <p className="text-[10px] font-semibold text-black/60 dark:text-white/60 uppercase tracking-wide">
              Total Memories
            </p>
            <p className="text-lg font-bold text-black dark:text-white mt-1">
              {memories.length}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-blue-500/5 dark:bg-blue-500/10">
            <p className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide">
              Active Skills
            </p>
            <p className="text-lg font-bold text-blue-600 dark:text-blue-400 mt-1">
              {skills.filter((s) => s.enabled).length}/{skills.length}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-amber-500/5 dark:bg-amber-500/10">
            <p className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide">
              High Importance
            </p>
            <p className="text-lg font-bold text-amber-600 dark:text-amber-400 mt-1">
              {memories.filter((m) => m.importance >= 8).length}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-green-500/5 dark:bg-green-500/10">
            <p className="text-[10px] font-semibold text-green-600 dark:text-green-400 uppercase tracking-wide">
              Total Accesses
            </p>
            <p className="text-lg font-bold text-green-600 dark:text-green-400 mt-1">
              {memories.reduce((sum, m) => sum + (m.accessCount || 0), 0)}
            </p>
          </div>
        </div>
      </SectionCard>

      {/* Info Section */}
      <SectionCard>
        <SectionTitle
          title="About Skills & Memory"
          subtitle="How these features work"
        />
        <div className="space-y-3">
          <div>
            <p className="text-xs font-medium text-black dark:text-white mb-1">Skills</p>
            <p className="text-xs text-black/60 dark:text-white/60 leading-relaxed">
              Enable or disable specific capabilities your agent can use. Disabled skills won't be used even if they'd be helpful, giving you full control over agent behavior.
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-black dark:text-white mb-1">Memory Types</p>
            <div className="text-xs text-black/60 dark:text-white/60 leading-relaxed space-y-1">
              <p><strong>User Profile:</strong> Information about who you are and your role</p>
              <p><strong>Feedback:</strong> How you prefer things done based on past interactions</p>
              <p><strong>Project:</strong> Context about current initiatives and goals</p>
              <p><strong>Reference:</strong> External resources and where to find information</p>
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-black dark:text-white mb-1">Memory Importance</p>
            <p className="text-xs text-black/60 dark:text-white/60 leading-relaxed">
              Memories are scored 1-10 based on how relevant they are. Higher-importance memories are recalled more frequently and used to provide personalized context.
            </p>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
