import { marked, type TokenizerAndRendererExtension } from "marked";
import katex from "katex";
import createDOMPurify from "dompurify";
import { JSDOM } from "jsdom";

marked.setOptions({
  gfm: true,
  breaks: false,
});

// Inline: $…$ or $$…$$. Opening $ must sit at a word boundary (start, whitespace,
// or an opening bracket) so we don't trip on currency like "$5". Closing $ may
// be followed by whitespace, punctuation, or a closing bracket — the official
// marked-katex-extension omits brackets, which breaks common cases like
// "…$u \ge 0$)." or "(see $x=1$)".
const OPEN_BOUNDARY = /[\s([{<]/;
const inlineRule =
  /^(\${1,2})(?!\$)((?:\\.|[^\\\n])*?(?:\\.|[^\\\n$]))\1(?=[\s?!.,:;)\]}>？！。，：；】」』]|$)/;
const blockRule = /^(\${1,2})\n((?:\\[^]|[^\\])+?)\n\1(?:\n|$)/;

function renderKatex(text: string, displayMode: boolean): string {
  return katex.renderToString(text, { throwOnError: false, output: "html", displayMode });
}

const inlineKatex: TokenizerAndRendererExtension = {
  name: "inlineKatex",
  level: "inline",
  start(src: string) {
    let offset = 0;
    let rest = src;
    while (rest) {
      const i = rest.indexOf("$");
      if (i === -1) return;
      const prev = i === 0 ? "" : rest.charAt(i - 1);
      const atBoundary = i === 0 ? true : OPEN_BOUNDARY.test(prev);
      if (atBoundary && inlineRule.test(rest.substring(i))) return offset + i;
      offset += i + 1;
      rest = rest.substring(i + 1).replace(/^\$+/, (m) => {
        offset += m.length;
        return "";
      });
    }
    return;
  },
  tokenizer(src: string) {
    const match = src.match(inlineRule);
    if (!match) return;
    return {
      type: "inlineKatex",
      raw: match[0],
      text: match[2].trim(),
      displayMode: match[1].length === 2,
    };
  },
  renderer(token) {
    return renderKatex(token.text as string, Boolean(token.displayMode));
  },
};

const blockKatex: TokenizerAndRendererExtension = {
  name: "blockKatex",
  level: "block",
  tokenizer(src: string) {
    const match = src.match(blockRule);
    if (!match) return;
    return {
      type: "blockKatex",
      raw: match[0],
      text: match[2].trim(),
      displayMode: match[1].length === 2,
    };
  },
  renderer(token) {
    return renderKatex(token.text as string, Boolean(token.displayMode)) + "\n";
  },
};

marked.use({ extensions: [inlineKatex, blockKatex] });

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
