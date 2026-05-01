import { color } from "@bainder/ui";

// Hex tokens are reused so the RN side and the WebView style stay in sync.
const HL = color.highlight;

// CSS for the rendered chapter document. Highlight classes mirror the web
// reader's `bd-highlight*` classes so stored colors are interchangeable
// across platforms.
function readerCss(bg: string, fg: string): string {
  return `
  html, body { margin: 0; padding: 0; background: ${bg}; color: ${fg}; }
  body {
    font-family: 'Iowan Old Style', 'Charter', Georgia, serif;
    font-size: 19px;
    line-height: 1.65;
    padding: 4px 0 16px;
    -webkit-text-size-adjust: 100%;
  }
  p { margin: 0.85em 0; }
  h1, h2, h3, h4, h5, h6 {
    font-family: 'Times New Roman', serif;
    font-weight: 500;
    line-height: 1.2;
    margin: 1.2em 0 0.6em;
  }
  h1 { font-size: 28px; }
  h2 { font-size: 24px; }
  h3 { font-size: 20px; }
  blockquote { margin: 1em 0; padding-left: 16px; border-left: 3px solid currentColor; opacity: 0.8; }
  img { max-width: 100%; height: auto; }
  a { color: inherit; text-decoration: underline; }
  ::selection { background: rgba(255, 200, 100, 0.4); }

  mark.bd-highlight { background-color: ${HL.pink}; color: inherit; padding: 0 1px; border-radius: 2px; }
  mark.bd-highlight.bd-highlight-yellow { background-color: ${HL.yellow}; }
  mark.bd-highlight.bd-highlight-green  { background-color: ${HL.green}; }
  mark.bd-highlight.bd-highlight-blue   { background-color: ${HL.blue}; }
  mark.bd-highlight.bd-highlight-purple { background-color: ${HL.purple}; }
  mark.bd-highlight[data-highlight-has-note] { box-shadow: inset 0 -2px 0 currentColor; }
  `;
}

// Inlined into the WebView. Mirrors packages/web/src/reader/textOffsets.ts and
// useHighlightLayer.ts, but trimmed to what runs inside the chapter document
// and bridged via window.ReactNativeWebView.postMessage.
const READER_RUNTIME = `
(function () {
  var SELECTOR = 'mark[data-highlight-id]';
  var COLORS = { pink: 'bd-highlight', yellow: 'bd-highlight bd-highlight-yellow', green: 'bd-highlight bd-highlight-green', blue: 'bd-highlight bd-highlight-blue', purple: 'bd-highlight bd-highlight-purple' };

  function postMessage(payload) {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify(payload));
    }
  }

  function postHeight() {
    var h = document.documentElement.scrollHeight || document.body.scrollHeight;
    postMessage({ type: 'height', value: h });
  }

  function anchorToCharOffset(container, node, offset) {
    var range = document.createRange();
    range.selectNodeContents(container);
    range.setEnd(node, offset);
    return range.toString().length;
  }

  function rangeToCharOffsets(container, range) {
    return {
      start: anchorToCharOffset(container, range.startContainer, range.startOffset),
      end: anchorToCharOffset(container, range.endContainer, range.endOffset),
    };
  }

  function charOffsetsToRange(container, start, end) {
    if (end < start) return null;
    var charCount = 0;
    var startNode = null, startOffset = 0, endNode = null, endOffset = 0;
    var walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
    var current = walker.nextNode();
    while (current) {
      var len = current.nodeValue ? current.nodeValue.length : 0;
      if (!startNode && start <= charCount + len) {
        startNode = current;
        startOffset = Math.max(0, start - charCount);
      }
      if (!endNode && end <= charCount + len) {
        endNode = current;
        endOffset = Math.max(0, end - charCount);
      }
      if (startNode && endNode) break;
      charCount += len;
      current = walker.nextNode();
    }
    if (!startNode || !endNode) return null;
    var range = document.createRange();
    range.setStart(startNode, startOffset);
    range.setEnd(endNode, endOffset);
    return range;
  }

  function wrapRangeWithMarks(range, className, attrs) {
    if (range.collapsed) return [];
    var root = range.commonAncestorContainer;
    var rootEl = root.nodeType === Node.TEXT_NODE ? root.parentElement : root;
    if (!rootEl) return [];
    var nodes = [];
    var walker = document.createTreeWalker(rootEl, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        return range.intersectsNode(n) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });
    var n = walker.nextNode();
    while (n) { nodes.push(n); n = walker.nextNode(); }
    var created = [];
    for (var i = 0; i < nodes.length; i++) {
      var tn = nodes[i];
      var s = 0, e = tn.nodeValue ? tn.nodeValue.length : 0;
      if (tn === range.startContainer) s = range.startOffset;
      if (tn === range.endContainer) e = range.endOffset;
      if (s === e) continue;
      var target = tn;
      if (s > 0) target = target.splitText(s);
      if (e - s < (target.nodeValue ? target.nodeValue.length : 0)) {
        target.splitText(e - s);
      }
      var mark = document.createElement('mark');
      mark.className = className;
      if (attrs) {
        for (var k in attrs) {
          if (Object.prototype.hasOwnProperty.call(attrs, k)) mark.setAttribute(k, attrs[k]);
        }
      }
      target.parentNode.insertBefore(mark, target);
      mark.appendChild(target);
      created.push(mark);
    }
    return created;
  }

  function unwrapMarks(container) {
    var marks = container.querySelectorAll(SELECTOR);
    marks.forEach(function (mark) {
      var parent = mark.parentNode;
      if (!parent) return;
      while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
      parent.removeChild(mark);
    });
    container.normalize();
  }

  function applyHighlights(list) {
    var body = document.body;
    if (!body) return;
    unwrapMarks(body);
    if (!list || list.length === 0) return;
    var ordered = list.slice().sort(function (a, b) {
      if (a.offsetStart !== b.offsetStart) return a.offsetStart - b.offsetStart;
      return (b.offsetEnd - b.offsetStart) - (a.offsetEnd - a.offsetStart);
    });
    for (var i = 0; i < ordered.length; i++) {
      var h = ordered[i];
      var range = charOffsetsToRange(body, h.offsetStart, h.offsetEnd);
      if (!range) continue;
      var attrs = { 'data-highlight-id': h.id };
      if (h.note) attrs['data-highlight-has-note'] = 'true';
      wrapRangeWithMarks(range, COLORS[h.color] || 'bd-highlight', attrs);
    }
    setTimeout(postHeight, 0);
  }

  function reportSelection() {
    var sel = window.getSelection();
    var body = document.body;
    if (!body || !sel || sel.rangeCount === 0 || sel.isCollapsed) {
      postMessage({ type: 'selection', cleared: true });
      return;
    }
    var range = sel.getRangeAt(0);
    if (!body.contains(range.startContainer) || !body.contains(range.endContainer)) {
      postMessage({ type: 'selection', cleared: true });
      return;
    }
    var startEl = range.startContainer.nodeType === Node.ELEMENT_NODE
      ? range.startContainer : range.startContainer.parentElement;
    if (startEl && startEl.closest && startEl.closest(SELECTOR)) {
      postMessage({ type: 'selection', cleared: true });
      return;
    }
    var text = range.toString();
    if (!text || !text.trim()) {
      postMessage({ type: 'selection', cleared: true });
      return;
    }
    var rect = range.getBoundingClientRect();
    var charRange = rangeToCharOffsets(body, range);
    postMessage({
      type: 'selection',
      rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height, bottom: rect.bottom, right: rect.right },
      charRange: charRange,
      text: text.length > 4000 ? text.slice(0, 4000) : text,
    });
  }

  // Selection events fire often during a drag. Debounce to a short window so
  // RN sees a settled rect once the user lifts their finger.
  var selectionTimer = null;
  document.addEventListener('selectionchange', function () {
    if (selectionTimer) clearTimeout(selectionTimer);
    selectionTimer = setTimeout(reportSelection, 120);
  });

  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t || !t.closest) return;
    var mark = t.closest(SELECTOR);
    if (!mark) return;
    var id = mark.getAttribute('data-highlight-id');
    if (!id) return;
    var rect = mark.getBoundingClientRect();
    postMessage({
      type: 'tap-highlight',
      id: id,
      rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height, bottom: rect.bottom, right: rect.right },
    });
  });

  window.bd_setHighlights = function (json) {
    try {
      var list = typeof json === 'string' ? JSON.parse(json) : json;
      applyHighlights(list);
    } catch (err) { /* ignore */ }
  };

  window.bd_clearSelection = function () {
    var sel = window.getSelection();
    if (sel) sel.removeAllRanges();
  };

  window.addEventListener('load', function () {
    postHeight();
    postMessage({ type: 'ready' });
  });
  setTimeout(postHeight, 200);
  setTimeout(postHeight, 1000);
  if (window.ResizeObserver) {
    new ResizeObserver(postHeight).observe(document.body);
  }
})();
`;

export function buildEpubHtml(inner: string, bg: string, fg: string): string {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no" />
<style>${readerCss(bg, fg)}</style>
</head>
<body>
${inner}
<script>${READER_RUNTIME}</script>
</body>
</html>`;
}
