import type { EditorState } from '@tiptap/pm/state';
import { NodeSelection, TextSelection } from '@tiptap/pm/state';

function currentBlock({ doc, selection }: EditorState) {
  const { $from, $to } = selection;
  if (selection instanceof NodeSelection && !$from.depth) {
    return { index: $from.index(0), node: selection.node, start: selection.from };
  }
  if (!(selection instanceof TextSelection) || $from.index(0) !== $to.index(0) || !$from.depth || !$to.depth) return null;
  const index = $from.index(0);
  const node = doc.child(index);
  return { index, node, start: $from.before(1) };
}

export function canMoveBlock(state: EditorState, direction: -1 | 1) {
  const block = currentBlock(state);
  return !!block && !!state.doc.maybeChild(block.index + direction);
}

export function moveBlock(state: EditorState, direction: -1 | 1) {
  const block = currentBlock(state);
  if (!block) return null;
  const neighbor = state.doc.maybeChild(block.index + direction);
  if (!neighbor) return null;

  const { start, node } = block;
  const { anchor, head } = state.selection;
  const delta = direction * neighbor.nodeSize;
  const from = direction < 0 ? start + delta : start;
  const to = direction < 0 ? start + node.nodeSize : start + node.nodeSize + delta;
  const transaction = state.tr.replaceWith(from, to, direction < 0 ? [node, neighbor] : [neighbor, node]);
  return transaction.setSelection(state.selection instanceof NodeSelection
    ? NodeSelection.create(transaction.doc, start + delta)
    : TextSelection.create(transaction.doc, anchor + delta, head + delta));
}
