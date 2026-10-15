import type { ReactNode } from 'react';

/**
 * The markdown subset the content pages use: `##`/`###` headings, paragraphs,
 * `-` and `1.` lists, and pipe tables. Every node is built as a React element —
 * the source is never handed to `dangerouslySetInnerHTML`, so whatever a content
 * record contains, it renders as text or not at all.
 *
 * Inline: `**bold**` and `[label](/path)` links. Anything else stays literal.
 */

type Block =
  | { kind: 'heading'; level: 2 | 3; text: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'list'; ordered: boolean; items: string[] }
  | { kind: 'table'; head: string[]; rows: string[][] };

function parse(source: string): Block[] {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;

  function flushParagraph() {
    if (paragraph.length > 0) {
      blocks.push({ kind: 'paragraph', text: paragraph.join(' ') });
      paragraph = [];
    }
  }
  function flushList() {
    if (list) {
      blocks.push({ kind: 'list', ordered: list.ordered, items: list.items });
      list = null;
    }
  }

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const trimmed = line.trim();
    const next = (lines[index + 1] ?? '').trim();

    if (!trimmed) {
      flushParagraph();
      flushList();
      continue;
    }

    if (trimmed.startsWith('### ')) {
      flushParagraph();
      flushList();
      blocks.push({ kind: 'heading', level: 3, text: trimmed.slice(4) });
      continue;
    }

    if (trimmed.startsWith('## ')) {
      flushParagraph();
      flushList();
      blocks.push({ kind: 'heading', level: 2, text: trimmed.slice(3) });
      continue;
    }

    // A pipe table: header row, then a `| --- |` rule, then the body rows.
    if (trimmed.startsWith('|') && /^\|[\s:|-]+\|$/.test(next)) {
      flushParagraph();
      flushList();
      const head = splitRow(trimmed);
      const rows: string[][] = [];
      index += 2; // skip the header and the rule
      while (index < lines.length && lines[index].trim().startsWith('|')) {
        rows.push(splitRow(lines[index].trim()));
        index += 1;
      }
      index -= 1;
      blocks.push({ kind: 'table', head, rows });
      continue;
    }

    if (/^[-*] /.test(trimmed)) {
      flushParagraph();
      if (!list || list.ordered) {
        flushList();
        list = { ordered: false, items: [] };
      }
      list.items.push(trimmed.slice(2));
      continue;
    }

    if (/^\d+\. /.test(trimmed)) {
      flushParagraph();
      if (!list || !list.ordered) {
        flushList();
        list = { ordered: true, items: [] };
      }
      list.items.push(trimmed.replace(/^\d+\.\s*/, ''));
      continue;
    }

    flushList();
    paragraph.push(trimmed);
  }

  flushParagraph();
  flushList();
  return blocks;
}

function splitRow(line: string): string[] {
  return line
    .replace(/^\||\|$/g, '')
    .split('|')
    .map((cell) => cell.trim());
}

/** `**bold**` and `[label](/href)`; everything else is text. */
function inline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*)|(\[[^\]]+\]\([^)\s]+\))/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let index = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    const token = match[0];
    const key = `${keyPrefix}-${index}`;
    index += 1;

    if (token.startsWith('**')) {
      nodes.push(<strong key={key}>{token.slice(2, -2)}</strong>);
    } else {
      const label = token.slice(1, token.indexOf(']'));
      const href = token.slice(token.indexOf('](') + 2, -1);
      // Only links the app itself can serve; anything else stays visible text.
      const safe = href.startsWith('/') || href.startsWith('#');
      nodes.push(
        safe ? (
          <a key={key} href={href} className="text-accent hover:underline">
            {label}
          </a>
        ) : (
          <span key={key}>{label}</span>
        ),
      );
    }
    last = pattern.lastIndex;
  }

  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export function Markdown({ source, className }: { source: string; className?: string }) {
  const blocks = parse(source);

  return (
    <div className={`space-y-3 text-sm leading-relaxed ${className ?? ''}`}>
      {blocks.map((block, index) => {
        const key = `block-${index}`;

        if (block.kind === 'heading') {
          return block.level === 2 ? (
            <h2 key={key} className="text-ink pt-2 text-base font-semibold">
              {inline(block.text, key)}
            </h2>
          ) : (
            <h3 key={key} className="text-ink pt-1 text-sm font-semibold">
              {inline(block.text, key)}
            </h3>
          );
        }

        if (block.kind === 'paragraph') {
          return (
            <p key={key} className="text-muted">
              {inline(block.text, key)}
            </p>
          );
        }

        if (block.kind === 'list') {
          const items = block.items.map((item, itemIndex) => (
            <li key={`${key}-${itemIndex}`} className="text-muted">
              {inline(item, `${key}-${itemIndex}`)}
            </li>
          ));
          return block.ordered ? (
            <ol key={key} className="list-decimal space-y-1 pl-5">
              {items}
            </ol>
          ) : (
            <ul key={key} className="list-disc space-y-1 pl-5">
              {items}
            </ul>
          );
        }

        return (
          <div key={key} className="border-line overflow-x-auto rounded-[var(--radius-panel)] border">
            <table className="w-full text-left text-sm">
              <thead className="bg-panel-alt text-muted text-11 tracking-wide uppercase">
                <tr>
                  {block.head.map((cell, cellIndex) => (
                    <th key={`${key}-h${cellIndex}`} className="px-4 py-2.5">
                      {inline(cell, `${key}-h${cellIndex}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.rows.map((row, rowIndex) => (
                  <tr key={`${key}-r${rowIndex}`} className="border-line border-t">
                    {row.map((cell, cellIndex) => (
                      <td
                        key={`${key}-r${rowIndex}-${cellIndex}`}
                        className={cellIndex === 0 ? 'text-ink px-4 py-2.5' : 'text-muted px-4 py-2.5'}
                      >
                        {inline(cell, `${key}-r${rowIndex}-${cellIndex}`)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}
