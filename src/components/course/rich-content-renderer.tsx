import Image from "next/image";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";

import { getMarkdownFromStoredContent } from "@/lib/content";
import { normalizeMarkdownForDisplay } from "@/lib/course-markdown";

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
          remarkPlugins={[remarkGfm, remarkBreaks]}
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
              typeof src === "string" && src.length ? (
                <figure className="course-markdown-figure">
                  <Image
                    loader={({ src: imageSrc }) => imageSrc}
                    unoptimized
                    src={src}
                    alt={alt ?? ""}
                    width={1600}
                    height={900}
                    sizes="(max-width: 1024px) 100vw, 768px"
                    className="course-markdown-image"
                  />
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
