import { cssLanguage } from '@codemirror/lang-css';
import { javascript, jsxLanguage } from '@codemirror/lang-javascript';
import { getIndentation, IndentContext, indentString, LanguageSupport } from '@codemirror/language';
import { EditorSelection, EditorState, Text, Transaction } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { parseMixed } from '@lezer/common';

import { keyBind } from './plugins';

/** JSX including syntax for CSS nested in <style> tags. */

export const jsx = () => [
  javascript({ jsx: true })
]

export function cssInJsx() {
  return new LanguageSupport(jsxLanguage.configure({
    wrap: parseMixed((ref, input) => {
      if (ref.name != "JSXElement")
        return null;

      const { from, to } = ref.node.firstChild!;

      if (input.read(from + 1, from + 6) != "style")
        return null;

      return {
        parser: cssLanguage.parser,
        overlay: [{
          from: to,
          to: ref.node.lastChild!.from
        }]
      };
    }),
  }));
}

/** Input handler will auto-close a JSX tag when '>' is typed. */
export function autoCloseTab() {
  return EditorView.inputHandler.of((view, from, to, inserted) => {
    const { doc } = view.state;

    if (inserted !== ">")
      return false;

    const { text } = doc.lineAt(from);
    const tagName = /<([a-zA-Z-]+)$/.exec(text);

    if (!tagName)
      return false;

    const insert = `></${tagName[1]}>`;

    view.dispatch({
      changes: { from, to, insert },
      selection: { anchor: from + 1 }
    });

    return true;
  });
}

export type CommandTarget = {
  state: EditorState;
  dispatch: (transaction: Transaction) => void;
}

/** Key command will line-split and indent, if cursor is between '>' and '<'. */
export function autoElementSplit() {
  return keyBind({
    key: "Enter",
    run(target: CommandTarget) {
      const { state } = target;

      const notBetweenTags = state.selection.ranges.find(range => (
        state.sliceDoc(range.from - 1, range.to + 1) !== "><"
      ));

      if (notBetweenTags)
        return false;

      const changes = state.changeByRange(({ from, to }) => {
        const cx = new IndentContext(state, {
          simulateBreak: from,
          simulateDoubleBreak: true
        });

        let offset = getIndentation(cx, from);

        if (offset == null) {
          const line = state.doc.lineAt(from).text;
          offset = /^\s*/.exec(line)![0].length;
        }

        const line = state.doc.lineAt(from);

        while (to < line.to && /\s/.test(line.text[to - line.from]))
          to++;

        const indent = indentString(state, offset);
        const closing = indentString(state, cx.lineIndent(line.from, -1));
        const insert = Text.of(["", indent, closing]);

        return {
          changes: { from, to, insert },
          range: EditorSelection.cursor(from + 1 + indent.length)
        };
      });

      target.dispatch(
        state.update(changes, {
          scrollIntoView: true,
          userEvent: "input"
        })
      );

      return true;
    }
  });
}