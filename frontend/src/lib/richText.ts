export type Part = { text: string; bold: boolean };
export type Block = { type: "p"; parts: Part[] } | { type: "ul"; items: Part[][] };

const BULLET = /^\s*(?:[-•*]|\d+[.)])\s+/;

function inline(line: string): Part[] {
  const parts: Part[] = [];
  let last = 0;
  for (const m of line.matchAll(/\*\*(.+?)\*\*/g)) {
    if (m.index > last) parts.push({ text: line.slice(last, m.index), bold: false });
    parts.push({ text: m[1], bold: true });
    last = m.index + m[0].length;
  }
  if (last < line.length) parts.push({ text: line.slice(last), bold: false });
  return parts;
}

/** Câu trả lời của bot → đoạn văn + danh sách gạch đầu dòng + chữ đậm. Không dùng innerHTML (an toàn XSS). */
export function parseRich(text: string): Block[] {
  const blocks: Block[] = [];
  let para: string[] = [];
  const flush = () => {
    if (para.length) {
      blocks.push({ type: "p", parts: inline(para.join("\n")) });
      para = [];
    }
  };
  for (const raw of text.split("\n")) {
    const line = raw.trimEnd();
    if (!line.trim()) { flush(); continue; }
    if (BULLET.test(line)) {
      flush();
      const item = inline(line.replace(BULLET, ""));
      const prev = blocks[blocks.length - 1];
      if (prev?.type === "ul") prev.items.push(item);
      else blocks.push({ type: "ul", items: [item] });
    } else {
      para.push(line.trim());
    }
  }
  flush();
  return blocks;
}
