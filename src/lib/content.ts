import { VideoType } from "@prisma/client";

export type RichTextDocument = {
  type: "doc";
  content: Array<Record<string, unknown>>;
};

export const emptyRichTextDocument: RichTextDocument = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

function parseUrl(url: string) {
  try {
    return new URL(url);
  } catch {
    return null;
  }
}

export function deriveVideoType(videoUrl?: string | null): VideoType {
  if (!videoUrl) {
    return VideoType.NONE;
  }

  const parsed = parseUrl(videoUrl);
  if (!parsed) {
    return VideoType.NONE;
  }

  const hostname = parsed.hostname.toLowerCase();
  if (hostname.includes("youtube.com") || hostname.includes("youtu.be")) {
    return VideoType.YOUTUBE;
  }

  if (hostname.includes("drive.google.com")) {
    return VideoType.GDRIVE;
  }

  return VideoType.NONE;
}

export function isSupportedVideoUrl(videoUrl?: string | null) {
  return deriveVideoType(videoUrl) !== VideoType.NONE;
}

export function getVideoEmbedUrl(videoUrl?: string | null) {
  if (!videoUrl) {
    return null;
  }

  const parsed = parseUrl(videoUrl);
  if (!parsed) {
    return null;
  }

  const hostname = parsed.hostname.toLowerCase();

  if (hostname.includes("youtu.be")) {
    const videoId = parsed.pathname.split("/").filter(Boolean)[0];
    return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
  }

  if (hostname.includes("youtube.com")) {
    const videoId =
      parsed.searchParams.get("v") ??
      parsed.pathname.split("/").filter(Boolean).at(-1);
    return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
  }

  if (hostname.includes("drive.google.com")) {
    const match = parsed.pathname.match(/\/d\/([^/]+)/);
    const fileId = match?.[1] ?? parsed.searchParams.get("id");
    return fileId ? `https://drive.google.com/file/d/${fileId}/preview` : null;
  }

  return null;
}

