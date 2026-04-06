export function normalizeMarkdownForDisplay(markdown: string) {
  return markdown.replace(
    /(^|\n)(https?:\/\/[^\s]+?\.(?:png|jpe?g|gif|webp|svg)(?:\?[^\s]*)?)(?=\n|$)/gi,
    "$1![]($2)",
  );
}
