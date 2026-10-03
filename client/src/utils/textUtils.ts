/**
 * Helper to clean display strings by trimming quotes, double quotes, escaped quotes, and extra whitespace
 */
export const cleanText = (text: string | null | undefined): string => {
  if (!text) return '';
  return text
    .trim()
    .replace(/^["'“”«»"]+|["'“”«»"]+$/g, '') // remove surrounding quotes
    .replace(/\\"/g, '"') // unescape internal quotes if any
    .replace(/""/g, '"') // fix double double quotes
    .trim();
};
