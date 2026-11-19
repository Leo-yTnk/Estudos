import { Extension, Mark, getSchema, type JSONContent } from '@tiptap/core';
import { TaskItem, TaskList } from '@tiptap/extension-list';
import { TableKit } from '@tiptap/extension-table';
import Highlight from '@tiptap/extension-highlight';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyleKit } from '@tiptap/extension-text-style';
import StarterKit from '@tiptap/starter-kit';
import { CollectionBlock, NoteImage, collectionText, localImage, readCollection } from './collections';
import type { NoteBlock, StudyNote } from '../types';

export function safeLink(value: string) {
  try {
    const url = new URL(value);
    return ['http:', 'https:', 'mailto:'].includes(url.protocol) ? url.href : null;
  } catch { return null; }
}

const paragraphIndent = Extension.create({
  name: 'paragraphIndent',
  addGlobalAttributes() {
    const safeIndent = (value: unknown) => {
      const level = Number(value);
      return Number.isInteger(level) && level >= 1 && level <= 6 ? level : 0;
    };
    return [{
      types: ['paragraph', 'heading'],
      attributes: {
        indent: {
          default: 0,
          parseHTML: (element) => safeIndent(element.dataset.indent),
          renderHTML: ({ indent }) => safeIndent(indent)
            ? { 'data-indent': safeIndent(indent), style: 'padding-inline-start: ' + (safeIndent(indent) * 1.25) + 'em' } : {},
        },
      },
    }];
  },
});

const scriptMark = (name: string, tag: string, opposite: string) => Mark.create({
  name, excludes: opposite,
  parseHTML: () => [{ tag }],
  renderHTML: () => [tag, 0],
});

export const documentExtensions = [
  Extension.create({
    name: 'noteLayout',
    addGlobalAttributes: () => [{ types: ['doc'], attributes: { noteWidth: { default: null } } }],
  }),
  StarterKit.configure({
    heading: { levels: [2, 3] },
    link: { openOnClick: false, defaultProtocol: 'https', isAllowedUri: (url) => !!safeLink(url) },
  }),
  TableKit.configure({ table: { renderWrapper: true } }),
  Highlight.configure({ multicolor: true }),
  TextStyleKit.configure({ backgroundColor: false }),
  paragraphIndent,
  CollectionBlock, NoteImage,
  scriptMark('superscript', 'sup', 'subscript'), scriptMark('subscript', 'sub', 'superscript'),
  TextAlign.configure({ types: ['paragraph', 'heading'], alignments: ['left', 'center', 'right', 'justify'] }),
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
    if (!valid) return undefined;
    const json = node.toJSON() as JSONContent;
    const normalize = (item: JSONContent) => {
      if (item.type === 'collection') item.attrs = { value: readCollection(item.attrs?.value) };
      if (item.type === 'noteImage') {
        const width = Number(item.attrs?.width);
        item.attrs = { image: localImage(item.attrs?.image),
          width: Number.isFinite(width) ? Math.min(100, Math.max(25, width)) : 100,
          align: ['left', 'right'].includes(item.attrs?.align) ? item.attrs?.align : 'center' };
      }
      item.content?.forEach(normalize);
    };
    if (json.attrs) {
      if (!['narrow', 'wide'].includes(json.attrs.noteWidth)) delete json.attrs;
    }
    normalize(json);
    return json;
  } catch { return undefined; }
}

export function noteText(note: StudyNote) {
  if (!note.content) return note.blocks.map(({ text, url }) => [text, url].filter(Boolean).join(' ')).join(' ');
  const pieces: string[] = [];
  const visit = (item: JSONContent) => {
    if (item.type === 'collection') pieces.push(collectionText(readCollection(item.attrs?.value)));
    if (item.type === 'noteImage') pieces.push(localImage(item.attrs?.image)?.alt ?? '');
    if (item.text) pieces.push(item.text);
    for (const mark of item.marks ?? []) {
      if (mark.type === 'link' && mark.attrs?.href) pieces.push(String(mark.attrs.href));
    }
    item.content?.forEach(visit);
  };
  visit(note.content);
  return pieces.join(' ');
}
