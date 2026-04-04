import { VideoType } from "@prisma/client";

type RichMark = {
  type?: string;
  attrs?: Record<string, unknown>;
};

type RichNode = {
  type?: string;
  text?: string;
  marks?: RichMark[];
  attrs?: Record<string, unknown>;
  content?: RichNode[];
};

export const emptyMarkdownDocument = "";

function parseUrl(url: string) {
  try {
    return new URL(url);
  } catch {
    return null;
  }
}

function isRichNode(value: unknown): value is RichNode {
  return typeof value === "object" && value !== null;
}

function escapeMarkdownText(value: string) {
  return value.replace(/([\\`*_{}[\]()#+\-.!|>])/g, "\\$1");
}

function applyMarks(text: string, marks?: RichMark[]) {
  return (marks ?? []).reduce((acc, mark) => {
    if (mark.type === "code") {
      return `\`${acc}\``;
    }

    if (mark.type === "bold") {
      return `**${acc}**`;
    }

    if (mark.type === "italic") {
      return `*${acc}*`;
    }

    if (mark.type === "strike") {
      return `~~${acc}~~`;
    }

    if (mark.type === "link") {
      const href = typeof mark.attrs?.href === "string" ? mark.attrs.href : undefined;
      return href ? `[${acc}](${href})` : acc;
    }

    return acc;
  }, text);
}

function renderInlineNodes(nodes: RichNode[]): string {
  return nodes
    .map((node) => {
      if (node.type === "text") {
        return applyMarks(escapeMarkdownText(node.text ?? ""), node.marks);
      }

      if (node.type === "hardBreak") {
        return "  \n";
      }

      if (node.type === "paragraph") {
        return renderInlineNodes(node.content ?? []);
      }

      return renderNodes(node.content ?? [], 0).trim();
    })
    .join("");
}

function indentBlock(block: string, prefix: string): string {
  return block
    .split("\n")
    .map((line) => `${prefix}${line}`)
    .join("\n");
}

function renderList(nodes: RichNode[], ordered: boolean, depth: number): string {
  return nodes
    .map((node, index) => renderListItem(node, ordered ? index + 1 : undefined, depth))
    .filter(Boolean)
    .join("\n");
}

function renderListItem(node: RichNode, orderedIndex: number | undefined, depth: number): string {
  const prefix = orderedIndex ? `${orderedIndex}. ` : "- ";
  const childPrefix = "  ".repeat(depth + 1);
  const inlineParts: string[] = [];
  const blockParts: string[] = [];

  for (const child of node.content ?? []) {
    if (child.type === "paragraph") {
      inlineParts.push(renderInlineNodes(child.content ?? []));
      continue;
    }

    if (child.type === "bulletList") {
      blockParts.push(renderList(child.content ?? [], false, depth + 1));
      continue;
    }

    if (child.type === "orderedList") {
      blockParts.push(renderList(child.content ?? [], true, depth + 1));
      continue;
    }

    const rendered = renderNodes([child], depth + 1).trim();
    if (rendered) {
      blockParts.push(rendered);
    }
  }

  const firstLine = `${"  ".repeat(depth)}${prefix}${inlineParts.join(" ").trim()}`.trimEnd();
  const nestedBlocks = blockParts.map((part) => indentBlock(part, childPrefix)).join("\n");

  return [firstLine, nestedBlocks].filter(Boolean).join("\n");
}

function renderNodes(nodes: RichNode[], depth: number): string {
  return nodes
    .map((node) => {
      switch (node.type) {
        case "heading": {
          const level = Math.min(Math.max(Number(node.attrs?.level ?? 2), 1), 6);
          return `${"#".repeat(level)} ${renderInlineNodes(node.content ?? []).trim()}`;
        }
        case "paragraph": {
          return renderInlineNodes(node.content ?? []).trim();
        }
        case "bulletList": {
          return renderList(node.content ?? [], false, depth);
        }
        case "orderedList": {
          return renderList(node.content ?? [], true, depth);
        }
        case "blockquote": {
          const blockContent = renderNodes(node.content ?? [], depth).trim();
          return blockContent ? indentBlock(blockContent, "> ") : "";
        }
        case "horizontalRule": {
          return "---";
        }
        case "codeBlock": {
          const language = typeof node.attrs?.language === "string" ? node.attrs.language : "";
          const code = (node.content ?? [])
            .map((child) => (child.type === "text" ? child.text ?? "" : renderInlineNodes(child.content ?? [])))
            .join("");
          return `\`\`\`${language}\n${code}\n\`\`\``;
        }
        case "text": {
          return applyMarks(escapeMarkdownText(node.text ?? ""), node.marks);
        }
        default: {
          return renderNodes(node.content ?? [], depth);
        }
      }
    })
    .filter(Boolean)
    .join("\n\n");
}

function isLegacyRichTextDocument(content: unknown): content is { type?: string; content?: RichNode[] } {
  return isRichNode(content) && Array.isArray(content.content);
}

export function getMarkdownFromStoredContent(content: unknown) {
  if (typeof content === "string") {
    return content;
  }

  if (isLegacyRichTextDocument(content)) {
    return renderNodes(content.content ?? [], 0).trim();
  }

  return "";
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
    const videoId = parsed.searchParams.get("v") ?? parsed.pathname.split("/").filter(Boolean).at(-1);
    return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
  }

  if (hostname.includes("drive.google.com")) {
    const match = parsed.pathname.match(/\/d\/([^/]+)/);
    const fileId = match?.[1] ?? parsed.searchParams.get("id");
    return fileId ? `https://drive.google.com/file/d/${fileId}/preview` : null;
  }

  return null;
}
