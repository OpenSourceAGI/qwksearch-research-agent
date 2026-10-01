import { getLLMText, source } from "@/lib/fumadocs/source";
import { notFound } from "next/navigation";

export const revalidate = false;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug?: string[] }> },
) {
  const { slug } = await params;
  const cleanSlug = slug?.map((s, i) => i === slug.length - 1 ? s.replace(/\.mdx$/, '') : s);
  const page = source.getPage(cleanSlug);
  if (!page) notFound();

  return new Response(await getLLMText(page), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}

export function generateStaticParams() {
  return source.generateParams();
}
