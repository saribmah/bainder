// Helpers for converting between DOM Ranges and character offsets into a
// container's textContent. These map directly to the offsets stored on
// `Highlight` rows server-side.

export type CharRange = { start: number; end: number };

// Character offset of a (node, offset) anchor relative to the start of
// `container`'s text content. Uses `Range.toString().length` so the count
// matches `container.textContent` for visible text.
export const anchorToCharOffset = (
  container: Node,
  anchorNode: Node,
  anchorOffset: number,
): number => {
  const range = document.createRange();
  range.selectNodeContents(container);
  range.setEnd(anchorNode, anchorOffset);
  return range.toString().length;
};

// Convert a DOM Range to character offsets relative to `container`. The
// range must be entirely within `container`.
export const rangeToCharOffsets = (container: Node, range: Range): CharRange => ({
  start: anchorToCharOffset(container, range.startContainer, range.startOffset),
  end: anchorToCharOffset(container, range.endContainer, range.endOffset),
});

// Inverse of the above: walk text nodes inside `container` until the
// cumulative character count reaches `start` / `end`, and build a Range
// at those positions. Returns null if the offsets are out of bounds.
export const charOffsetsToRange = (container: Node, start: number, end: number): Range | null => {
  if (end < start) return null;
  let charCount = 0;
  let startNode: Text | null = null;
  let startOffset = 0;
  let endNode: Text | null = null;
  let endOffset = 0;
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let current: Node | null = walker.nextNode();
  while (current) {
    const text = current as Text;
    const len = text.nodeValue?.length ?? 0;
    if (!startNode && start <= charCount + len) {
      startNode = text;
      startOffset = Math.max(0, start - charCount);
    }
    if (!endNode && end <= charCount + len) {
      endNode = text;
      endOffset = Math.max(0, end - charCount);
    }
    if (startNode && endNode) break;
    charCount += len;
    current = walker.nextNode();
  }
  if (!startNode || !endNode) return null;
  const range = document.createRange();
  range.setStart(startNode, startOffset);
  range.setEnd(endNode, endOffset);
  return range;
};

// Wrap each text-node fragment intersecting `range` with a `<mark>` carrying
// the supplied class names and attributes. Splits text nodes at the range
// boundaries so partial overlaps stay correct. Returns the list of created
// elements so callers can attach event handlers.
export type WrapMarkOptions = {
  className: string;
  attributes?: Record<string, string>;
};

export const wrapRangeWithMarks = (range: Range, options: WrapMarkOptions): HTMLElement[] => {
  if (range.collapsed) return [];

  const root = range.commonAncestorContainer;
  const rootEl = root.nodeType === Node.TEXT_NODE ? root.parentElement : (root as HTMLElement);
  if (!rootEl) return [];

  // Collect all text nodes that intersect the range. Snapshotting up-front
  // avoids walker iteration breaking when we splitText below.
  const textNodes: Text[] = [];
  const walker = document.createTreeWalker(rootEl, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) =>
      range.intersectsNode(node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT,
  });
  let n: Node | null = walker.nextNode();
  while (n) {
    textNodes.push(n as Text);
    n = walker.nextNode();
  }

  const created: HTMLElement[] = [];
  for (const tn of textNodes) {
    let target = tn;
    let start = 0;
    let end = target.nodeValue?.length ?? 0;
    if (tn === range.startContainer) start = range.startOffset;
    if (tn === range.endContainer) end = range.endOffset;
    if (start === end) continue;
    if (start > 0) target = target.splitText(start);
    if (end - start < (target.nodeValue?.length ?? 0)) {
      target.splitText(end - start);
    }
    const mark = document.createElement("mark");
    mark.className = options.className;
    if (options.attributes) {
      for (const [k, v] of Object.entries(options.attributes)) {
        mark.setAttribute(k, v);
      }
    }
    target.parentNode?.insertBefore(mark, target);
    mark.appendChild(target);
    created.push(mark);
  }
  return created;
};

// Replace every `<mark>` matching `selector` inside `container` with its
// child text content, then merge adjacent text nodes via `normalize()`.
// Used to clear stale highlights before re-applying.
export const unwrapMarks = (container: HTMLElement, selector: string): void => {
  const marks = container.querySelectorAll<HTMLElement>(selector);
  marks.forEach((mark) => {
    const parent = mark.parentNode;
    if (!parent) return;
    while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
    parent.removeChild(mark);
  });
  container.normalize();
};
