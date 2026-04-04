import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { getMarkdownFromStoredContent } from "@/lib/content";

type RichContentRendererProps = {
  content: unknown;
};

export function RichContentRenderer({ content }: RichContentRendererProps) {
  const markdown = getMarkdownFromStoredContent(content).trim();

  if (!markdown) {
    return <p className="text-sm text-[#0c0910]/60">Aucun contenu de chapitre n’a encore été rédigé.</p>;
  }

  return (
    <div className="prose prose-slate max-w-none space-y-4 prose-headings:font-semibold prose-headings:text-[#0c0910] prose-p:text-[#0c0910]/85 prose-strong:text-[#0c0910] prose-code:rounded prose-code:bg-[#0c0910]/6 prose-code:px-1 prose-code:py-0.5 prose-code:font-mono prose-code:text-sm prose-code:text-[#0c0910] prose-pre:overflow-x-auto prose-pre:rounded-2xl prose-pre:bg-[#0c0910] prose-pre:p-4 prose-pre:text-white prose-a:text-[#0F63FF] prose-blockquote:border-l-[#0F63FF]/30 prose-blockquote:text-[#0c0910]/75 prose-li:text-[#0c0910]/85">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: (props) => <a {...props} target="_blank" rel="noreferrer" />,
          code: ({ className, children, ...props }) => (
            <code {...props} className={className}>
              {children}
            </code>
          ),
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
