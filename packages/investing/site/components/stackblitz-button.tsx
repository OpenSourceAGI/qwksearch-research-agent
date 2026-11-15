const REPO_PATH = 'OpenSourceAGI/qwksearch-research-agent/tree/master/packages/investing/examples';

/**
 * "Open in StackBlitz" badge for a project under packages/investing/examples.
 * StackBlitz imports the folder straight from GitHub, installs it and runs
 * the `startCommand` from its .stackblitzrc.
 */
export function StackBlitzButton({ example, file = 'src/index.ts' }: { example: string; file?: string }) {
  const href = `https://stackblitz.com/github/${REPO_PATH}/${example}?file=${encodeURIComponent(file)}`;
  return (
    <a href={href} target="_blank" rel="noreferrer" className="not-prose inline-block my-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="https://developer.stackblitz.com/img/open_in_stackblitz.svg" alt="Open in StackBlitz" height={32} />
    </a>
  );
}
