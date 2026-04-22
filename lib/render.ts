import { marked } from "marked";
import createDOMPurify from "dompurify";
import { JSDOM } from "jsdom";

marked.setOptions({
  gfm: true,
  breaks: false,
});

const jsdomWindow = new JSDOM("").window;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const DOMPurify = createDOMPurify(jsdomWindow as any);

export function renderMarkdown(source: string): string {
  const html = marked.parse(source, { async: false }) as string;
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    ADD_ATTR: ["target", "rel"],
  });
}

export function sanitizeUserHtmlFragment(source: string): string {
  return DOMPurify.sanitize(source, { USE_PROFILES: { html: true } });
}
