import YTDlpWrap from "yt-dlp-wrap";
import { NextRequest, NextResponse } from "next/server";
import { Readable } from "node:stream";
import { access, chmod, mkdir } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import os from "node:os";

export const runtime = "nodejs";
const ONLY_SUPPORTED_FORMAT = "mp4";
const MODE_OPTIONS = "options";
const MODE_DOWNLOAD = "download";

const isYouTubeUrl = (urlString: string) => {
  try {
    const parsed = new URL(urlString);
    return parsed.hostname === "www.youtube.com" || parsed.hostname === "youtube.com" || parsed.hostname === "m.youtube.com" || parsed.hostname === "youtu.be";
  } catch {
    return false;
  }
};

const sanitizeFilename = (value: string) =>
  value
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);

const buildOutputFilename = (videoTitle: string, customName: string, extension: string) => {
  const preferredName = customName.trim() ? customName : videoTitle;
  const safeBase = sanitizeFilename(preferredName) || "youtube-download";
  const safeExtension = (extension || "mp4").replace(/[^a-z0-9]/gi, "");
  return `${safeBase}.${safeExtension || "mp4"}`;
};

const getEstimatedSizeBytes = (format: any) => {
  const exactSize = Number(format?.filesize);
  if (Number.isFinite(exactSize) && exactSize > 0) return exactSize;
  const approxSize = Number(format?.filesize_approx);
  if (Number.isFinite(approxSize) && approxSize > 0) return approxSize;
  return null;
};

const getQualityLabel = (format: any) => {
  const height = Number(format?.height);
  const fps = Number(format?.fps);
  if (Number.isFinite(height) && height > 0) {
    return Number.isFinite(fps) && fps > 0 ? `${height}p${fps > 30 ? ` ${fps}fps` : ""}` : `${height}p`;
  }
  const formatNote = typeof format?.format_note === "string" ? format.format_note.trim() : "";
  return formatNote || "Unknown quality";
};

const getFormatOptions = (videoInfo: any) => {
  const formats = Array.isArray(videoInfo?.formats) ? videoInfo.formats : [];
  const progressiveMp4 = formats.filter((format: any) => {
    const formatId = typeof format?.format_id === "string" ? format.format_id.trim() : "";
    if (!formatId) return false;
    if (String(format?.ext || "").toLowerCase() !== "mp4") return false;
    if (String(format?.vcodec || "").toLowerCase() === "none") return false;
    if (String(format?.acodec || "").toLowerCase() === "none") return false;
    return true;
  });

  return progressiveMp4
    .map((format: any) => ({
      id: String(format.format_id),
      ext: String(format.ext || "mp4").toLowerCase(),
      qualityLabel: getQualityLabel(format),
      width: Number.isFinite(Number(format?.width)) ? Number(format.width) : null,
      height: Number.isFinite(Number(format?.height)) ? Number(format.height) : null,
      fps: Number.isFinite(Number(format?.fps)) ? Number(format.fps) : null,
      estimatedSizeBytes: getEstimatedSizeBytes(format),
      tbr: Number.isFinite(Number(format?.tbr)) ? Number(format.tbr) : 0,
    }))
    .sort((a: any, b: any) => {
      const heightDiff = (b.height || 0) - (a.height || 0);
      if (heightDiff !== 0) return heightDiff;
      const fpsDiff = (b.fps || 0) - (a.fps || 0);
      if (fpsDiff !== 0) return fpsDiff;
      return (b.tbr || 0) - (a.tbr || 0);
    });
};

const ytDlpBinaryPath = process.env.YT_DLP_PATH || path.join(os.tmpdir(), "yt-dlp-bin", process.platform === "win32" ? "yt-dlp.exe" : "yt-dlp");

const getYtDlpReleaseAssetUrl = () => {
  if (process.platform === "win32") {
    return "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe";
  }
  if (process.platform === "darwin") {
    return "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos";
  }
  return "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux";
};

let ytDlpReadyPromise: Promise<void> | null = null;
const ensureYtDlpBinary = async () => {
  if (ytDlpReadyPromise) return ytDlpReadyPromise;
  ytDlpReadyPromise = (async () => {
    try {
      await access(ytDlpBinaryPath, constants.F_OK);
      if (process.platform !== "win32") {
        await chmod(ytDlpBinaryPath, 0o755);
      }
      return;
    } catch {
      await mkdir(path.dirname(ytDlpBinaryPath), { recursive: true });
      await YTDlpWrap.downloadFile(getYtDlpReleaseAssetUrl(), ytDlpBinaryPath);
      if (process.platform !== "win32") {
        await chmod(ytDlpBinaryPath, 0o755);
      }
    }
  })();
  return ytDlpReadyPromise;
};

const getYtDlp = async () => {
  await ensureYtDlpBinary();
  return new YTDlpWrap(ytDlpBinaryPath);
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const inputUrl = typeof body?.url === "string" ? body.url.trim() : "";
    const customName = typeof body?.filename === "string" ? body.filename : "";
    const formatId = typeof body?.formatId === "string" ? body.formatId.trim() : "";

    if (!inputUrl) {
      return NextResponse.json({ error: "URL is required." }, { status: 400 });
    }
    if (!isYouTubeUrl(inputUrl)) {
      return NextResponse.json({ error: "Only YouTube URLs are supported for this action." }, { status: 400 });
    }

    const params = new URLSearchParams({ url: inputUrl, format: ONLY_SUPPORTED_FORMAT });
    if (customName.trim()) {
      params.set("filename", customName.trim());
    }
    if (formatId) {
      params.set("formatId", formatId);
    }

    return NextResponse.json({
      ok: true,
      downloadUrl: `/api/youtube-download?${params.toString()}`,
      message: "Download is ready.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `Download failed: ${message}` }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const inputUrl = req.nextUrl.searchParams.get("url")?.trim() || "";
  const customName = req.nextUrl.searchParams.get("filename")?.trim() || "";
  const requestedFormat = (req.nextUrl.searchParams.get("format") || ONLY_SUPPORTED_FORMAT).toLowerCase().trim();
  const requestedMode = (req.nextUrl.searchParams.get("mode") || MODE_DOWNLOAD).toLowerCase().trim();
  const formatId = req.nextUrl.searchParams.get("formatId")?.trim() || "";

  if (!inputUrl) {
    return NextResponse.json({ error: "URL query param is required." }, { status: 400 });
  }
  if (!isYouTubeUrl(inputUrl)) {
    return NextResponse.json({ error: "Invalid YouTube URL." }, { status: 400 });
  }
  if (requestedFormat !== ONLY_SUPPORTED_FORMAT) {
    return NextResponse.json({ error: "Invalid format. Only mp4 is supported." }, { status: 400 });
  }
  if (requestedMode !== MODE_OPTIONS && requestedMode !== MODE_DOWNLOAD) {
    return NextResponse.json({ error: "Invalid mode." }, { status: 400 });
  }

  try {
    const ytDlp = await getYtDlp();
    const videoInfo = await ytDlp.getVideoInfo([inputUrl, "--no-playlist"]);
    if (requestedMode === MODE_OPTIONS) {
      const options = getFormatOptions(videoInfo);
      return NextResponse.json({
        ok: true,
        title: typeof videoInfo?.title === "string" && videoInfo.title.trim() ? videoInfo.title : "youtube-download",
        options,
        recommendedFormatId: options[0]?.id || null,
      });
    }

    const videoTitle = typeof videoInfo?.title === "string" && videoInfo.title.trim() ? videoInfo.title : "youtube-download";

    const extension = "mp4";
    const outputFilename = buildOutputFilename(videoTitle, customName, extension);
    const availableOptions = getFormatOptions(videoInfo);
    const selectedFormatId = formatId || availableOptions[0]?.id || "";
    if (!selectedFormatId) {
      return NextResponse.json({ error: "No MP4 download formats are available for this video." }, { status: 500 });
    }
    if (!availableOptions.some((option: any) => option.id === selectedFormatId)) {
      return NextResponse.json({ error: "Requested quality is not available for this video." }, { status: 400 });
    }

    const ytDlpArgs = [inputUrl, "--no-playlist", "-f", selectedFormatId, "-o", "-"];

    const nodeStream = ytDlp.execStream(ytDlpArgs);
    const webStream = Readable.toWeb(nodeStream as unknown as Readable) as ReadableStream;

    return new NextResponse(webStream, {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": `attachment; filename="${outputFilename}"`,
        "Cache-Control": "no-store",
        "X-Requested-Format": requestedFormat,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        error: `YouTube download failed: ${message}.`,
      },
      { status: 500 },
    );
  }
}
