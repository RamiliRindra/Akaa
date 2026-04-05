import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { getMarkdownFromStoredContent } from "@/lib/content";

type RichContentRendererProps = {
  content: unknown;
};

export function RichContentRenderer({ content }: RichContentRendererProps) {
  const markdown = normalizeMarkdownForDisplay(getMarkdownFromStoredContent(content).trim());

  if (!markdown) {
    return (
      <div className="panel-card px-5 py-6 text-sm text-[#2c2f31]/65">
        Aucun contenu de chapitre n’a encore été rédigé.
      </div>
    );
  }

  return (
    <div className="panel-card px-5 py-6 sm:px-8 sm:py-8">
      <div className="course-markdown">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({ children }) => <h1 className="course-markdown-h1">{children}</h1>,
            h2: ({ children }) => <h2 className="course-markdown-h2">{children}</h2>,
            h3: ({ children }) => <h3 className="course-markdown-h3">{children}</h3>,
            h4: ({ children }) => <h4 className="course-markdown-h4">{children}</h4>,
            p: ({ children }) => <p className="course-markdown-p">{children}</p>,
            ul: ({ children }) => <ul className="course-markdown-ul">{children}</ul>,
            ol: ({ children }) => <ol className="course-markdown-ol">{children}</ol>,
            li: ({ children }) => <li className="course-markdown-li">{children}</li>,
            blockquote: ({ children }) => <blockquote className="course-markdown-blockquote">{children}</blockquote>,
            hr: () => <hr className="course-markdown-hr" />,
            table: ({ children }) => (
              <div className="course-markdown-table-wrap">
                <table className="course-markdown-table">{children}</table>
              </div>
            ),
            thead: ({ children }) => <thead className="course-markdown-thead">{children}</thead>,
            th: ({ children }) => <th className="course-markdown-th">{children}</th>,
            td: ({ children }) => <td className="course-markdown-td">{children}</td>,
            a: ({ children, ...props }) => (
              <a {...props} className="course-markdown-link" target="_blank" rel="noreferrer">
                {children}
              </a>
            ),
            strong: ({ children }) => <strong className="course-markdown-strong">{children}</strong>,
            code: ({ className, children, ...props }) => (
              <code {...props} className={className ? `course-markdown-code ${className}` : "course-markdown-code"}>
                {children}
              </code>
            ),
            pre: ({ children }) => <pre className="course-markdown-pre">{children}</pre>,
            img: ({ src, alt }) =>
              src ? (
                <figure className="course-markdown-figure">
                  <img src={src} alt={alt ?? ""} className="course-markdown-image" loading="lazy" />
                  {alt ? <figcaption className="course-markdown-caption">{alt}</figcaption> : null}
                </figure>
              ) : null,
          }}
        >
          {markdown}
        </ReactMarkdown>
      </div>
    </div>
  );
}

function normalizeMarkdownForDisplay(markdown: string) {
  return markdown.replace(
    /(^|\n)(https?:\/\/[^\s]+?\.(?:png|jpe?g|gif|webp|svg)(?:\?[^\s]*)?)(?=\n|$)/gi,
    "$1![]($2)",
  );
}
