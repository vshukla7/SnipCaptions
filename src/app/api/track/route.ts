import { NextResponse } from "next/server";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// In-memory fallback so the app works without a database configured.
const memStore: Record<string, { dau: number; exports: number; ips: string[] }> =
  {};

async function track(eventType: string, ipHash: string, today: string) {
  const uri = process.env.MONGODB_URI;
  if (uri) {
    try {
      const mongoose = (await import("mongoose")).default;
      if (mongoose.connection.readyState === 0) {
        await mongoose.connect(uri, { serverSelectionTimeoutMS: 4000 });
      }
      const DailySchema = new mongoose.Schema(
        {
          date: { type: String, required: true, unique: true },
          dauCount: { type: Number, default: 0 },
          totalExports: { type: Number, default: 0 },
          uniqueIpHashes: { type: [String], default: [] },
        },
        { timestamps: true },
      );
      const Daily =
        mongoose.models.DailyAnalytics ??
        mongoose.model("DailyAnalytics", DailySchema);
      let doc = await Daily.findOne({ date: today });
      if (!doc) {
        doc = new Daily({
          date: today,
          dauCount: 1,
          totalExports: 0,
          uniqueIpHashes: [ipHash],
        });
      } else if (!doc.uniqueIpHashes.includes(ipHash)) {
        doc.uniqueIpHashes.push(ipHash);
        doc.dauCount += 1;
      }
      if (eventType === "VIDEO_EXPORT") doc.totalExports += 1;
      await doc.save();
      return NextResponse.json({ success: true, dau: doc.dauCount });
    } catch {
      // fall through to in-memory
    }
  }

  const rec = (memStore[today] ??= { dau: 0, exports: 0, ips: [] });
  if (!rec.ips.includes(ipHash)) {
    rec.ips.push(ipHash);
    rec.dau += 1;
  }
  if (eventType === "VIDEO_EXPORT") rec.exports += 1;
  return NextResponse.json({ success: true, dau: rec.dau, memory: true });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      eventType?: string;
      videoDuration?: number;
    };
    const eventType = body.eventType ?? "API_CALL";
    const today = new Date().toISOString().split("T")[0];
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "127.0.0.1";
    const ipHash = crypto
      .createHash("md5")
      .update(ip + today)
      .digest("hex");
    return await track(eventType, ipHash, today);
  } catch {
    return NextResponse.json(
      { success: false, error: "Tracking failed" },
      { status: 500 },
    );
  }
}
