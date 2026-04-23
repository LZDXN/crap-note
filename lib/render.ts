import { marked } from "marked";
import markedKatex from "marked-katex-extension";
import createDOMPurify from "dompurify";
import { JSDOM } from "jsdom";

marked.setOptions({
  gfm: true,
  breaks: false,
});

marked.use(markedKatex({ throwOnError: false, output: "html" }));

const jsdomWindow = new JSDOM("").window;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const DOMPurify = createDOMPurify(jsdomWindow as any);

export function renderMarkdown(source: string): string {
  const html = marked.parse(source, { async: false }) as string;
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true, mathMl: true, svg: true },
    ADD_ATTR: ["target", "rel", "style"],
  });
}

export function sanitizeUserHtmlFragment(source: string): string {
  return DOMPurify.sanitize(source, { USE_PROFILES: { html: true } });
}
