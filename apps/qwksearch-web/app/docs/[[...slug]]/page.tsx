import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from 'fumadocs-ui/page';
import { source } from 'user-help-docs';
import { docsConfig } from 'user-help-docs/config';
import { getGithubUrl, getMarkdownUrl } from 'user-help-docs/llms';
import { getMDXComponents } from 'user-help-docs/mdx-components';
import { Breadcrumb } from 'user-help-docs/components/breadcrumb';
import { DocsActions } from 'user-help-docs/components/docs-actions';

export default async function Page(props: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await props.params;
  const page = source.getPage(slug);
  if (!page) notFound();

  // The body and its outline are compiled by `helpDocsMdxPlugin` during the
  // build. Compiling here instead would need `new Function`, which the
  // Cloudflare Worker this app deploys to refuses to run.
  const { data } = page;
  const MDX = data.body;

  // The docs index is a front door, not a doc: its own MDX opens with a hero
  // that carries the title and the calls to action. Leaving the page chrome on
  // would print the title twice and put a breadcrumb above a landing page, so
  // the index gets the body alone.
  const isLandingPage = !slug || slug.length === 0;

  return (
    <DocsPage
      toc={data.toc}
      full={data.full}
      editOnGithub={{
        owner: docsConfig.githubEdit.owner,
        repo: docsConfig.githubEdit.repo,
        sha: docsConfig.githubEdit.sha,
        path: `${docsConfig.githubEdit.pathPrefix}/${page.path}`,
      }}
    >
      {isLandingPage ? null : (
        <>
          <Breadcrumb tree={source.pageTree} />
          <DocsTitle>{data.title}</DocsTitle>
          {data.description ? <DocsDescription>{data.description}</DocsDescription> : null}
        </>
      )}
      <DocsBody>
        {isLandingPage ? null : (
          <DocsActions markdownUrl={getMarkdownUrl(page)} githubUrl={getGithubUrl(page)} />
        )}
        <MDX components={getMDXComponents()} />
      </DocsBody>
    </DocsPage>
  );
}

export function generateStaticParams() {
  return source.generateParams();
}

export async function generateMetadata(props: {
  params: Promise<{ slug?: string[] }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  const page = source.getPage(slug);
  if (!page) notFound();

  const { data } = page;

  return {
    title: `${data.title} | ${docsConfig.title}`,
    description: data.description ?? docsConfig.description,
  };
}
