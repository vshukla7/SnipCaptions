import type { Metadata } from "next";
import Link from "next/link";
import { BLOGS } from "@/lib/blogs";

export const metadata: Metadata = {
  title: "Blog — SnipCaptions",
  description:
    "Guides and tips on auto-captions, short-form video, Gemini transcription, and client-side video processing for creators.",
  alternates: { canonical: "/blogs" },
  openGraph: {
    title: "Blog — SnipCaptions",
    description:
      "Guides and tips on auto-captions, short-form video, Gemini transcription, and client-side video processing.",
    url: "/blogs",
    type: "website",
  },
};

export default function BlogsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)]">
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12 sm:px-10 lg:px-16">
        <header className="mb-10">
          <p className="text-sm font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
            SnipCaptions Blog
          </p>
          <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight text-[var(--foreground)] sm:text-5xl">
            Tips, guides &amp; product news
          </h1>
          <p className="mt-3 max-w-2xl text-[var(--muted-foreground)]">
            Practical articles on captions, short-form video, and private,
            client-side processing.
          </p>
        </header>

        <div className="grid gap-6">
          {BLOGS.map((post) => (
            <Link
              key={post.slug}
              href={`/blogs/${post.slug}`}
              className="group rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 transition-colors hover:border-[var(--brand-blue)]"
            >
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
              <h2 className="mt-2 text-xl font-medium text-[var(--foreground)] group-hover:text-[var(--brand-blue)]">
                {post.title}
              </h2>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                {post.description}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {post.tags.slice(0, 4).map((t) => (
                  <span
                    key={t}
                    className="rounded-full bg-[var(--editor-card)] px-3 py-1 text-xs text-[var(--editor-text-muted)]"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
