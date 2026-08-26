export interface BlogSection {
  heading?: string;
  paragraphs: string[];
}

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string;
  author: string;
  tags: string[];
  readingTime: string;
  sections: BlogSection[];
}

export const BLOGS: BlogPost[] = [
  {
    slug: "free-auto-captions-for-reels-shorts-tiktok",
    title: "Free Auto Captions for Reels, Shorts & TikTok (No Watermark, 1080p)",
    description:
      "Learn how to add accurate, watermark-free 1080p captions to short-form videos for free using client-side processing and your own Gemini API key.",
    date: "2026-08-20",
    author: "SnipCaptions Team",
    tags: ["auto captions", "reels", "youtube shorts", "tiktok", "free tools"],
    readingTime: "5 min read",
    sections: [
      {
        paragraphs: [
          "Captions are no longer optional for short-form video. Over 80% of viewers watch Reels, YouTube Shorts, and TikTok with the sound off, which means on-screen text is what actually drives retention and watch-through.",
          "The problem is that most caption tools lock HD exports, watermarks, or per-minute pricing behind a paywall. SnipCaptions takes a different approach: everything runs in your browser, the export is free and watermark-free at 1080p, and you bring your own Gemini API key.",
        ],
      },
      {
        heading: "Why client-side captions matter",
        paragraphs: [
          "Because audio extraction, transcription, and video rendering all happen on your device, your source video never leaves the browser. There are no server queues, no upload limits, and no monthly subscription just to download a clip.",
          "This also means rendering is as fast as your machine. WebCodecs acceleration lets modern browsers encode H.264 directly on the GPU, so a 60-second clip finishes in seconds rather than waiting on a remote render farm.",
        ],
      },
      {
        heading: "The four caption themes",
        paragraphs: [
          "SnipCaptions ships with four embeddable caption styles: Clean Minimal, Neon Glow, Kinetic Bounce, and Word-by-Word Highlight. Each is tuned for a different vibe — Neon for gaming clips, Kinetic for energetic edits, and Word-by-Word for education and storytelling.",
          "Pick a theme, preview it live against your footage in the Remotion player, then export. That is the entire workflow.",
        ],
      },
    ],
  },
  {
    slug: "add-captions-with-your-own-gemini-api-key",
    title: "How to Add Captions Using Your Own Gemini API Key (Step-by-Step)",
    description:
      "A practical walkthrough for connecting a Google Gemini API key to SnipCaptions and generating word-level transcripts in minutes.",
    date: "2026-08-18",
    author: "SnipCaptions Team",
    tags: ["gemini", "api key", "transcription", "tutorial"],
    readingTime: "4 min read",
    sections: [
      {
        paragraphs: [
          "SnipCaptions uses Google's Gemini models for speech-to-text. You provide the key, so you stay in control of usage, billing, and privacy. The key is stored only in your browser's local storage and is never sent to our servers.",
        ],
      },
      {
        heading: "Step 1 — Get a Gemini API key",
        paragraphs: [
          "Open Google AI Studio, create a key, and copy it. On the free tier this is enough for everyday captioning of short clips.",
        ],
      },
      {
        heading: "Step 2 — Paste it into SnipCaptions",
        paragraphs: [
          "Click “Add API Key” in the top-right of the app, paste your key, and we run a quick validation ping to confirm it works before you upload anything.",
        ],
      },
      {
        heading: "Step 3 — Upload, generate, export",
        paragraphs: [
          "Drop in a video up to two minutes, choose a language, and hit Generate Captions. Gemini returns word-level timestamps, which the player and exporter use to sync the text frame-accurately.",
        ],
      },
    ],
  },
  {
    slug: "best-caption-styles-for-short-form-video",
    title: "Best Caption Styles for Short-Form Video in 2026",
    description:
      "A breakdown of the most effective on-screen caption styles for engagement, accessibility, and brand consistency.",
    date: "2026-08-15",
    author: "SnipCaptions Team",
    tags: ["caption styles", "design", "engagement", "accessibility"],
    readingTime: "6 min read",
    sections: [
      {
        paragraphs: [
          "Not all captions are created equal. The right style depends on your niche, your brand, and where the video is published. Here is how the four SnipCaptions themes perform in practice.",
        ],
      },
      {
        heading: "Clean Minimal",
        paragraphs: [
          "Best for tutorials, corporate, and lifestyle content. White, centered, easy to read on any background. If you are unsure, start here.",
        ],
      },
      {
        heading: "Neon Glow",
        paragraphs: [
          "Best for gaming, music, and night-life clips. The colored halo pops against dark footage and feels native to vertical video culture.",
        ],
      },
      {
        heading: "Kinetic Bounce & Word-by-Word Highlight",
        paragraphs: [
          "These two are built for retention. Kinetic Bounce adds spring physics as each word lands, while Word-by-Word Highlight colors the spoken word in real time — both keep the eye locked on the text.",
        ],
      },
    ],
  },
  {
    slug: "client-side-video-processing-privacy",
    title: "Client-Side Video Processing: Why Your Files Never Leave the Browser",
    description:
      "Understanding the architecture behind private, fast, zero-cost video captioning and why it is safer than uploading to a server.",
    date: "2026-08-12",
    author: "SnipCaptions Team",
    tags: ["privacy", "webcodecs", "architecture", "security"],
    readingTime: "5 min read",
    sections: [
      {
        paragraphs: [
          "Traditional captioning pipelines upload your video to a server, transcribe it in the cloud, render it, and send a link back. Every step is a copy of your content sitting on someone else's infrastructure.",
          "SnipCaptions flips that model. The browser extracts audio, sends only a short transcription request to Gemini using your key, and renders the final MP4 locally with WebCodecs. The source file is never uploaded to us.",
        ],
      },
      {
        heading: "Cost and speed",
        paragraphs: [
          "With no server GPUs to pay for, the product can stay free for HD exports. And because rendering is local and hardware-accelerated, there is no queue to wait in.",
        ],
      },
    ],
  },
  {
    slug: "gemini-flash-for-video-captions",
    title: "Why Gemini Flash Is a Great Fit for Video Captions",
    description:
      "How Gemini's fast, multimodal models enable accurate word-level timestamps that power dynamic caption animations.",
    date: "2026-08-10",
    author: "SnipCaptions Team",
    tags: ["gemini", "speech to text", "ai", "models"],
    readingTime: "4 min read",
    sections: [
      {
        paragraphs: [
          "Accurate captions depend on more than just recognizing words — you need to know exactly when each word starts and ends. Gemini's multimodal models can return structured JSON with word-level timestamps, which is exactly what caption animations need.",
        ],
      },
      {
        heading: "Structured output",
        paragraphs: [
          "By requesting a strict response schema, SnipCaptions gets back a clean list of words with start and end times in seconds. That data drives both the live preview and the exported video without any post-processing.",
        ],
      },
      {
        heading: "Bring your own key",
        paragraphs: [
          "Because you connect your own Gemini key, you control rate limits and cost, and you are not locked into a vendor's captioning pricing.",
        ],
      },
    ],
  },
];

export function getBlog(slug: string): BlogPost | undefined {
  return BLOGS.find((b) => b.slug === slug);
}
