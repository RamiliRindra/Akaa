import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { getMarkdownFromStoredContent } from "@/lib/content";

type RichContentRendererProps = {
  content: unknown;
};

export function RichContentRenderer({ content }: RichContentRendererProps) {
  const markdown = getMarkdownFromStoredContent(content).trim();

  if (!markdown) {
    return (
      <div className="panel-card px-5 py-6 text-sm text-[#2c2f31]/65">
        Aucun contenu de chapitre n’a encore été rédigé.
      </div>
    );
  }

  return (
    <div className="panel-card px-5 py-6 sm:px-8 sm:py-8">
      <div className="prose prose-slate max-w-none space-y-4 prose-headings:font-display prose-headings:font-black prose-headings:tracking-tight prose-headings:text-[#2c2f31] prose-p:text-[#2c2f31]/85 prose-strong:text-[#2c2f31] prose-code:rounded prose-code:bg-[#0c0910]/6 prose-code:px-1 prose-code:py-0.5 prose-code:font-mono prose-code:text-sm prose-code:text-[#0c0910] prose-pre:overflow-x-auto prose-pre:rounded-[1.6rem] prose-pre:bg-[#0c0910] prose-pre:p-5 prose-pre:text-white prose-a:text-[#0F63FF] prose-a:no-underline hover:prose-a:underline prose-blockquote:border-l-[#0F63FF]/30 prose-blockquote:text-[#2c2f31]/75 prose-li:text-[#2c2f31]/85">
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
    </div>
  );
}
