'use client';

import React, { useMemo } from 'react';
import { ChevronDown, ExternalLinkIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger as PopoverTriggerBase } from 'fumadocs-ui/components/ui/popover';
import { cva } from 'class-variance-authority';
import { buttonVariants } from '../../ui/button';

const PopoverTrigger = PopoverTriggerBase as any;

const optionVariants = cva(
  'text-sm p-2 rounded-lg inline-flex items-center gap-2 hover:text-fd-accent-foreground hover:bg-fd-accent [&_svg]:size-4',
);

interface AIProvider {
  id: string;
  title: string;
  getHref: (params: { q: string; githubUrl?: string }) => string;
  icon?: React.ReactNode;
}

const AI_PROVIDERS: AIProvider[] = [
  {
    id: 'github',
    title: 'Open in GitHub',
    getHref: ({ githubUrl }) => githubUrl || '',
    icon: <ExternalLinkIcon />,
  },
  {
    id: 'qwksearch',
    title: 'QwkSearch',
    getHref: ({ q }) => `https://qwksearch.com/?q=${encodeURIComponent(q)}`,
    icon: <ExternalLinkIcon />,
  },
];

export function AskAIDropdown({ markdownUrl, githubUrl }: { markdownUrl: string; githubUrl?: string }) {
  const q = useMemo(() => `Read and answer questions about this page: ${markdownUrl}`, [markdownUrl]);

  return (
    <Popover>
      <PopoverTrigger className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-2')}>
        Ask AI <ChevronDown className="size-4" />
      </PopoverTrigger>
      <PopoverContent className="flex flex-col p-1 w-48">
        {AI_PROVIDERS.map((provider) => (
          <a
            key={provider.id}
            href={provider.getHref({ q, githubUrl })}
            target="_blank"
            rel="noreferrer"
            className={optionVariants()}
          >
            {provider.icon}
            {provider.title}
          </a>
        ))}
      </PopoverContent>
    </Popover>
  );
}
