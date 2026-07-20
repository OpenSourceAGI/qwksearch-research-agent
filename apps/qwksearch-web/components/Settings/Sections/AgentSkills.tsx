'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, BookOpen, Globe2, FileText, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UserAgentSkill {
  id: string;
  skillId: string;
  enabled: boolean;
}

interface SkillInfo {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  category: string;
}

const AVAILABLE_SKILLS: SkillInfo[] = [
  {
    id: 'web-research',
    name: 'Web Research',
    description: 'Search and retrieve information from the web in real-time',
    icon: <Globe2 className="w-4 h-4" />,
    category: 'Information Retrieval',
  },
  {
    id: 'document-analysis',
    name: 'Document Analysis',
    description: 'Analyze and extract insights from documents and PDFs',
    icon: <FileText className="w-4 h-4" />,
    category: 'Document Processing',
  },
  {
    id: 'knowledge-synthesis',
    name: 'Knowledge Synthesis',
    description: 'Synthesize information from multiple sources',
    icon: <Lightbulb className="w-4 h-4" />,
    category: 'Analysis',
  },
  {
    id: 'citations',
    name: 'Citations',
    description: 'Track and manage citations and sources',
    icon: <BookOpen className="w-4 h-4" />,
    category: 'Source Management',
  },
];

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

const SkillToggle = ({
  skill,
  enabled,
  saving,
  onToggle,
}: {
  skill: SkillInfo;
  enabled: boolean;
  saving: boolean;
  onToggle: (skillId: string, enabled: boolean) => void;
}) => (
  <div className="flex items-start justify-between gap-3 py-3 px-3 rounded-lg border border-light-200/50 dark:border-dark-200/50 bg-light-primary/50 dark:bg-dark-secondary/30 hover:border-light-200 dark:hover:border-dark-200 transition-colors">
    <div className="flex items-start gap-3 flex-1 min-w-0">
      <div className="mt-1 p-2 rounded-lg bg-blue-500/10 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex-shrink-0">
        {skill.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-black dark:text-white">{skill.name}</p>
        <p className="text-[11px] text-black/50 dark:text-white/50 mt-0.5">
          {skill.description}
        </p>
        <p className="text-[10px] text-black/40 dark:text-white/40 mt-1">
          {skill.category}
        </p>
      </div>
    </div>
    <button
      onClick={() => onToggle(skill.id, !enabled)}
      disabled={saving}
      className={cn(
        'flex-shrink-0 w-10 h-6 rounded-full transition-all duration-200 relative',
        enabled
          ? 'bg-[#24A0ED]'
          : 'bg-light-200 dark:bg-dark-300',
        'disabled:opacity-50 disabled:cursor-not-allowed'
      )}
      title={enabled ? 'Disable skill' : 'Enable skill'}
    >
      <div
        className={cn(
          'absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform duration-200',
          enabled && 'translate-x-4'
        )}
      />
      {saving && (
        <Loader2 className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 animate-spin text-white" />
      )}
    </button>
  </div>
);

export default function AgentSkills() {
  const [userSkills, setUserSkills] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [savingSkill, setSavingSkill] = useState<string | null>(null);

  useEffect(() => {
    const fetchSkills = async () => {
      try {
        const res = await fetch('/api/user/agent-skills');
        if (res.ok) {
          const skills = await res.json();
          const skillMap: Record<string, boolean> = {};
          skills.forEach((s: UserAgentSkill) => {
            skillMap[s.skillId] = s.enabled;
          });
          setUserSkills(skillMap);
        }
      } catch (err) {
        console.error('Failed to load agent skills:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSkills();
  }, []);

  const handleToggle = async (skillId: string, enabled: boolean) => {
    setSavingSkill(skillId);
    try {
      const res = await fetch('/api/user/agent-skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skillId, enabled }),
      });
      if (!res.ok) throw new Error();
      setUserSkills((prev) => ({ ...prev, [skillId]: enabled }));
      toast.success(`Skill ${enabled ? 'enabled' : 'disabled'}`);
    } catch (err) {
      toast.error('Failed to update skill preference');
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

  const categories = Array.from(new Set(AVAILABLE_SKILLS.map((s) => s.category)));

  return (
    <div className="flex-1 space-y-4 overflow-y-auto px-6 py-6">
      <SectionCard>
        <SectionTitle
          title="Agent Skills"
          subtitle="Choose which skills your agent can use for research and analysis."
        />
        <div className="space-y-4">
          {categories.map((category) => (
            <div key={category}>
              <h5 className="text-[11px] font-semibold text-black/60 dark:text-white/60 uppercase tracking-wide mb-2 px-1">
                {category}
              </h5>
              <div className="space-y-2">
                {AVAILABLE_SKILLS.filter((s) => s.category === category).map((skill) => (
                  <SkillToggle
                    key={skill.id}
                    skill={skill}
                    enabled={userSkills[skill.id] ?? true}
                    saving={savingSkill === skill.id}
                    onToggle={handleToggle}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard>
        <SectionTitle
          title="About Agent Skills"
          subtitle="Manage agent capabilities"
        />
        <p className="text-xs text-black/60 dark:text-white/60 leading-relaxed">
          Agent skills determine what actions your research agent can take. Disabling a skill will prevent the agent from using that capability even if it would be helpful for your query. Enable or disable skills based on your research needs.
        </p>
      </SectionCard>
    </div>
  );
}
