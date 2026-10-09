export const titleCase = (text) => text.replace(/\b\w/g, (c) => c.toUpperCase());

export const wordCount = function wordCount(text) {
  return text.split(/\s+/).filter(Boolean).length;
};
