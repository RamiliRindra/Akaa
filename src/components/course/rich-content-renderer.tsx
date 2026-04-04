import type { ReactNode } from "react";

type RichNode = {
  type?: string;
  text?: string;
  marks?: Array<{ type?: string }>;
  attrs?: Record<string, unknown>;
  content?: RichNode[];
};

type RichContentRendererProps = {
  content: unknown;
};

function applyMarks(text: ReactNode, marks?: Array<{ type?: string }>) {
  return (marks ?? []).reduce<ReactNode>((acc, mark, index) => {
    if (mark.type === "bold") {
      return <strong key={index}>{acc}</strong>;
    }
    if (mark.type === "italic") {
      return <em key={index}>{acc}</em>;
    }
    if (mark.type === "strike") {
      return <s key={index}>{acc}</s>;
    }
    if (mark.type === "code") {
      return (
        <code key={index} className="rounded bg-[#0c0910]/6 px-1 py-0.5 text-sm">
          {acc}
        </code>
      );
    }
    return acc;
  }, text);
}

function renderNode(node: RichNode, key: string): ReactNode {
  if (node.type === "text") {
    return <span key={key}>{applyMarks(node.text ?? "", node.marks)}</span>;
  }

  const children = (node.content ?? []).map((child, index) => renderNode(child, `${key}-${index}`));

  switch (node.type) {
    case "heading": {
      const level = Number(node.attrs?.level ?? 2);
      if (level === 1) {
        return <h1 key={key} className="text-3xl font-bold text-[#0c0910]">{children}</h1>;
      }
      if (level === 3) {
        return <h3 key={key} className="text-xl font-semibold text-[#0c0910]">{children}</h3>;
      }
      return <h2 key={key} className="text-2xl font-bold text-[#0c0910]">{children}</h2>;
    }
    case "bulletList":
      return <ul key={key} className="list-disc space-y-2 pl-6">{children}</ul>;
    case "orderedList":
      return <ol key={key} className="list-decimal space-y-2 pl-6">{children}</ol>;
    case "listItem":
      return <li key={key}>{children}</li>;
    case "blockquote":
      return <blockquote key={key} className="border-l-4 border-[#0F63FF]/20 pl-4 italic text-[#0c0910]/80">{children}</blockquote>;
    case "horizontalRule":
      return <hr key={key} className="border-[#0c0910]/10" />;
    case "hardBreak":
      return <br key={key} />;
    case "paragraph":
    default:
      return <p key={key} className="leading-7 text-[#0c0910]/85">{children.length ? children : "\u00A0"}</p>;
  }
}

export function RichContentRenderer({ content }: RichContentRendererProps) {
  const document = content as { content?: RichNode[] } | null;
  const nodes = document?.content ?? [];

  if (!nodes.length) {
    return <p className="text-sm text-[#0c0910]/60">Aucun contenu de chapitre n’a encore été rédigé.</p>;
  }

  return <div className="space-y-4">{nodes.map((node, index) => renderNode(node, `node-${index}`))}</div>;
}

