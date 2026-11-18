import { getSchema, type JSONContent } from '@tiptap/core';
import { TaskItem, TaskList } from '@tiptap/extension-list';
import { TableKit } from '@tiptap/extension-table';
import Highlight from '@tiptap/extension-highlight';
import TextAlign from '@tiptap/extension-text-align';
import StarterKit from '@tiptap/starter-kit';
import type { NoteBlock, StudyNote } from '../types';

export function safeLink(value: string) {
  try {
    const url = new URL(value);
    return ['http:', 'https:', 'mailto:'].includes(url.protocol) ? url.href : null;
  } catch { return null; }
}

export const documentExtensions = [
  StarterKit.configure({
    heading: { levels: [2, 3] },
    link: { openOnClick: false, defaultProtocol: 'https', isAllowedUri: (url) => !!safeLink(url) },
  }),
  TableKit.configure({ table: { renderWrapper: true } }),
  Highlight,
  TextAlign.configure({ types: ['paragraph', 'heading'], alignments: ['left', 'center', 'right'] }),
  TaskList,
  TaskItem.configure({ nested: true }),
];
const schema = getSchema(documentExtensions);

function paragraph(text: string, marks?: JSONContent['marks']): JSONContent {
  return { type: 'paragraph', content: text.split(/\r\n|\r|\n/).flatMap((line, index): JSONContent[] => [
    ...(index ? [{ type: 'hardBreak' }] : []), ...(line ? [{ type: 'text', text: line, marks }] : []),
  ]) };
}

export function fromBlocks(blocks: NoteBlock[]): JSONContent {
  const content: JSONContent[] = [];
  for (const block of blocks) {
    if (block.type === 'heading') {
      content.push({ ...paragraph(block.text), type: 'heading', attrs: { level: 2 } });
    } else if (block.type === 'check') {
      const item = { type: 'taskItem', attrs: { checked: !!block.checked }, content: [paragraph(block.text)] };
      const previous = content.at(-1);
      if (previous?.type === 'taskList') previous.content?.push(item);
      else content.push({ type: 'taskList', content: [item] });
    } else if (block.type === 'link' && block.url) {
      const href = safeLink(block.url);
      content.push(href ? paragraph(block.text || href, [{ type: 'link', attrs: { href } }])
        : paragraph([block.text, block.url].filter(Boolean).join('\n')));
    } else {
      content.push(paragraph(block.text));
    }
  }
  return { type: 'doc', content: content.length ? content : [paragraph('')] };
}

export function validateDocument(value: unknown): JSONContent | undefined {
  if (!value || typeof value !== 'object') return undefined;
  try {
    const node = schema.nodeFromJSON(value);
    if (node.type !== schema.topNodeType) return undefined;
    node.check();
    let valid = true;
    node.descendants((item) => {
      if (item.marks.some((mark) => mark.type.name === 'link' && !safeLink(String(mark.attrs.href)))) valid = false;
    });
    return valid ? node.toJSON() : undefined;
  } catch { return undefined; }
}

export function noteText(note: StudyNote) {
  if (!note.content) return note.blocks.map(({ text, url }) => [text, url].filter(Boolean).join(' ')).join(' ');
  const pieces: string[] = [];
  const visit = (item: JSONContent) => {
    if (item.text) pieces.push(item.text);
    for (const mark of item.marks ?? []) {
      if (mark.type === 'link' && mark.attrs?.href) pieces.push(String(mark.attrs.href));
    }
    item.content?.forEach(visit);
  };
  visit(note.content);
  return pieces.join(' ');
}
