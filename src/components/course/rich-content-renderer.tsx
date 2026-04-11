import Image from "next/image";
import React from "react";
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
      <div className="course-reading-area text-sm text-[var(--color-text)]/65">
        Aucun contenu de chapitre n’a encore été rédigé.
      </div>
    );
  }

  return (
    <div className="course-reading-area">
      <div className="course-markdown">
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkBreaks]}
          components={{
            h1: ({ children }) => <h1 className="course-markdown-h1">{children}</h1>,
            h2: ({ children }) => <h2 className="course-markdown-h2">{children}</h2>,
            h3: ({ children }) => <h3 className="course-markdown-h3">{children}</h3>,
            h4: ({ children }) => <h4 className="course-markdown-h4">{children}</h4>,
            p: ({ children }) => {
              // ReactMarkdown wraps block-level images in a <p>. Since our img override
              // returns a <figure>, that would produce invalid HTML (<figure> inside <p>)
              // and a hydration error. If any child is an image element (detected via a
              // `src` prop — present on the React element BEFORE our img override runs),
              // skip the <p> wrapper entirely.
              const childArray = React.Children.toArray(children).filter(
                (child) => !(typeof child === "string" && child.trim() === ""),
              );
              const hasImage = childArray.some(
                (child) =>
                  React.isValidElement(child) &&
                  typeof (child.props as { src?: unknown }).src === "string",
              );
              if (hasImage) {
                return <>{children}</>;
              }
              return <p className="course-markdown-p">{children}</p>;
            },
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
