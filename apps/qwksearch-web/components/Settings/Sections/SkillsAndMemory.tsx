'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Brain, Zap, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MemoryEntry {
  id: string;
  name: string;
  type: 'user' | 'feedback' | 'project' | 'reference';
  description: string;
  lastUpdated: string;
}

interface SkillInfo {
  id: string;
  name: string;
  description: string;
  type: 'available' | 'active';
}

const SKILL_CATEGORIES = {
  'Information Retrieval': [
    { id: 'web-search', name: 'Web Search', description: 'Search across the internet in real-time' },
    { id: 'document-fetch', name: 'Document Fetching', description: 'Retrieve and analyze web content' },
  ],
  'Code & Development': [
    { id: 'code-analysis', name: 'Code Analysis', description: 'Analyze and understand codebases' },
    { id: 'git-integration', name: 'Git Integration', description: 'Access repository history and changes' },
  ],
  'Data Processing': [
    { id: 'data-extraction', name: 'Data Extraction', description: 'Extract structured data from content' },
    { id: 'csv-processing', name: 'CSV Processing', description: 'Parse and analyze CSV files' },
  ],
  'Knowledge Management': [
    { id: 'memory-recall', name: 'Memory Recall', description: 'Access your stored memories and context' },
    { id: 'context-synthesis', name: 'Context Synthesis', description: 'Synthesize information across memories' },
  ],
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
  const colors = {
    user: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    feedback: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    project: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
    reference: 'bg-green-500/10 text-green-600 dark:text-green-400',
  };
  const labels = {
    user: 'User Profile',
    feedback: 'Feedback',
    project: 'Project',
    reference: 'Reference',
  };
  return (
    <span className={cn('inline-block px-2 py-1 rounded text-[10px] font-medium', colors[type])}>
      {labels[type]}
    </span>
  );
};

export default function SkillsAndMemory() {
  const [memories, setMemories] = useState<MemoryEntry[]>([]);
  const [enabledSkills, setEnabledSkills] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [savingSkill, setSavingSkill] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch enabled skills
        const skillsRes = await fetch('/api/user/enabled-skills');
        if (skillsRes.ok) {
          const skills = await skillsRes.json();
          setEnabledSkills(new Set(skills.map((s: any) => s.id)));
        }

        // Fetch memories (this is a mock - adjust endpoint as needed)
        // For now, we'll show a placeholder since memories are stored locally
        setMemories([
          {
            id: '1',
            name: 'API Client Usage',
            type: 'reference',
            description: 'Use qwksearch-api-client for API calls',
            lastUpdated: new Date(Date.now() - 86400000).toISOString(),
          },
          {
            id: '2',
            name: 'Kokoro Integration',
            type: 'project',
            description: 'Client-side TTS fully integrated with settings panel',
            lastUpdated: new Date(Date.now() - 172800000).toISOString(),
          },
        ]);
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
      setEnabledSkills((prev) => {
        const next = new Set(prev);
        if (enabled) next.add(skillId);
        else next.delete(skillId);
        return next;
      });
      toast.success(`Skill ${enabled ? 'enabled' : 'disabled'}`);
    } catch (err) {
      toast.error('Failed to update skill');
    } finally {
      setSavingSkill(null);
    }
  };

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
          {Object.entries(SKILL_CATEGORIES).map(([category, skills]) => (
            <div key={category}>
              <h5 className="text-[11px] font-semibold text-black/60 dark:text-white/60 uppercase tracking-wide mb-2 px-1">
                {category}
              </h5>
              <div className="space-y-2">
                {skills.map((skill) => (
                  <div
                    key={skill.id}
                    className="flex items-start justify-between gap-3 py-3 px-3 rounded-lg border border-light-200/50 dark:border-dark-200/50 bg-light-primary/50 dark:bg-dark-secondary/30 hover:border-light-200 dark:hover:border-dark-200 transition-colors"
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="mt-1 p-2 rounded-lg bg-blue-500/10 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex-shrink-0">
                        <Zap className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-black dark:text-white">{skill.name}</p>
                        <p className="text-[11px] text-black/50 dark:text-white/50 mt-0.5">
                          {skill.description}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleSkillToggle(skill.id, !enabledSkills.has(skill.id))}
                      disabled={savingSkill === skill.id}
                      className={cn(
                        'flex-shrink-0 w-10 h-6 rounded-full transition-all duration-200 relative',
                        enabledSkills.has(skill.id)
                          ? 'bg-[#24A0ED]'
                          : 'bg-light-200 dark:bg-dark-300',
                        'disabled:opacity-50 disabled:cursor-not-allowed'
                      )}
                      title={enabledSkills.has(skill.id) ? 'Disable skill' : 'Enable skill'}
                    >
                      <div
                        className={cn(
                          'absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform duration-200',
                          enabledSkills.has(skill.id) && 'translate-x-4'
                        )}
                      />
                      {savingSkill === skill.id && (
                        <Loader2 className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 animate-spin text-white" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Memory Section */}
      <SectionCard>
        <SectionTitle
          title="Your Memories"
          subtitle="Information saved about you and your preferences"
        />
        {memories.length > 0 ? (
          <div className="space-y-3">
            {memories.map((memory) => (
              <div
                key={memory.id}
                className="p-3 rounded-lg border border-light-200/50 dark:border-dark-200/50 bg-light-primary/50 dark:bg-dark-secondary/30 hover:border-light-200 dark:hover:border-dark-200 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-xs font-medium text-black dark:text-white truncate">
                        {memory.name}
                      </p>
                      <MemoryBadge type={memory.type} />
                    </div>
                    <p className="text-[11px] text-black/50 dark:text-white/50">
                      {memory.description}
                    </p>
                    <p className="text-[10px] text-black/30 dark:text-white/30 mt-1">
                      Updated {new Date(memory.lastUpdated).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    className="flex-shrink-0 text-black/40 dark:text-white/40 hover:text-black/60 dark:hover:text-white/60 transition-colors"
                    title="View memory"
                  >
                    <Brain className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-500/5 border border-blue-500/20 dark:bg-blue-500/10 dark:border-blue-500/30">
            <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
            <p className="text-xs text-blue-600 dark:text-blue-400">
              No memories saved yet. Interact with the agent to build your memory profile.
            </p>
          </div>
        )}
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
            <p className="text-xs font-medium text-black dark:text-white mb-1">Memory</p>
            <p className="text-xs text-black/60 dark:text-white/60 leading-relaxed">
              The system learns about you through interactions. Memories include your preferences, role, project context, and useful references for personalized assistance.
            </p>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
