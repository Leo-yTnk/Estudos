import type { Editor } from '@tiptap/core';

export async function copyNoteSelection(editor: Editor, cut: boolean) {
  const { selection, doc } = editor.state;
  if (selection.empty) return;
  const { dom, text } = editor.view.serializeForClipboard(selection.content());
  try {
    await navigator.clipboard.write([new ClipboardItem({
      'text/html': new Blob([dom.innerHTML], { type: 'text/html' }),
      'text/plain': new Blob([text], { type: 'text/plain' }),
    })]);
  } catch {
    await navigator.clipboard.writeText(text);
  }
  if (cut && !editor.isDestroyed && editor.state.doc.eq(doc) && editor.state.selection.eq(selection)) {
    editor.commands.deleteSelection();
  }
}

export async function pasteNoteSelection(editor: Editor, plain: boolean) {
  const { selection, doc } = editor.state;
  let content: { text: string; html?: string };
  if (plain) {
    content = { text: await navigator.clipboard.readText() };
  } else {
    try {
      const items = await navigator.clipboard.read();
      const htmlItem = items.find((item) => item.types.includes('text/html'));
      const textItem = items.find((item) => item.types.includes('text/plain'));
      content = htmlItem ? { html: await (await htmlItem.getType('text/html')).text(), text: '' }
        : { text: textItem ? await (await textItem.getType('text/plain')).text() : '' };
    } catch (error) {
      if (typeof navigator.clipboard?.read === 'function') throw error;
      content = { text: await navigator.clipboard.readText() };
    }
  }
  if (editor.isDestroyed || !editor.state.doc.eq(doc) || !editor.state.selection.eq(selection)) return;
  editor.commands.focus();
  if (content.html) editor.view.pasteHTML(content.html);
  else if (content.text) editor.view.pasteText(content.text);
}
