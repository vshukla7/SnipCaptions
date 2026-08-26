import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BLOGS, getBlog } from "@/lib/blogs";

export function generateStaticParams() {
  return BLOGS.map((b) => ({ slug: b.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlog(slug);
  if (!post) return { title: "Not found — SnipCaptions" };

  const url = `/blogs/${post.slug}`;
  return {
    title: `${post.title} — SnipCaptions`,
    description: post.description,
    alternates: { canonical: url },
    openGraph: {
      title: post.title,
      description: post.description,
      url,
      type: "article",
      publishedTime: post.date,
      authors: [post.author],
      tags: post.tags,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getBlog(slug);
  if (!post) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    author: { "@type": "Organization", name: post.author },
    publisher: { "@type": "Organization", name: "SnipCaptions" },
    mainEntityOfPage: `https://snipcaptions.in/blogs/${post.slug}`,
    keywords: post.tags.join(", "),
  };

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12 sm:px-10 lg:px-16">
        <Link
          href="/blogs"
          className="text-sm text-[var(--muted-foreground)] hover:text-[var(--brand-blue)]"
        >
          ← All articles
        </Link>

        <header className="mt-6 mb-8">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--muted-foreground)]">
            <time dateTime={post.date}>
              {new Date(post.date).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </time>
            <span>·</span>
            <span>{post.readingTime}</span>
          </div>
          <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-[var(--foreground)] sm:text-4xl">
            {post.title}
          </h1>
          <p className="mt-3 text-[var(--muted-foreground)]">{post.description}</p>
        </header>

        <article className="space-y-6 text-[var(--foreground)]">
          {post.sections.map((section, i) => (
            <section key={i} className="space-y-3">
              {section.heading ? (
                <h2 className="text-xl font-medium text-[var(--foreground)]">
                  {section.heading}
                </h2>
              ) : null}
              {section.paragraphs.map((p, j) => (
                <p key={j} className="leading-relaxed text-[var(--muted-foreground)]">
                  {p}
                </p>
              ))}
            </section>
          ))}
        </article>

        <div className="mt-10 flex flex-wrap gap-2">
          {post.tags.map((t) => (
            <span
              key={t}
              className="rounded-full bg-[var(--editor-card)] px-3 py-1 text-xs text-[var(--editor-text-muted)]"
            >
              {t}
            </span>
          ))}
        </div>
      </main>
    </div>
  );
}
