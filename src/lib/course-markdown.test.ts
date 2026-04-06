import { describe, expect, it } from "vitest";

import { normalizeMarkdownForDisplay } from "@/lib/course-markdown";

describe("normalizeMarkdownForDisplay", () => {
  it("convertit une URL d'image seule sur une ligne en image Markdown", () => {
    const markdown = "Introduction\nhttps://example.com/image-demo.png\nConclusion";

    expect(normalizeMarkdownForDisplay(markdown)).toContain("![](https://example.com/image-demo.png)");
  });

  it("laisse intact un Markdown qui ne contient pas d'URL d'image isolée", () => {
    const markdown = "## Titre\n\nUn paragraphe normal avec un [lien](https://example.com).";

    expect(normalizeMarkdownForDisplay(markdown)).toBe(markdown);
  });
});
