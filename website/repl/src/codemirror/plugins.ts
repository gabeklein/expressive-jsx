import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { cssLanguage } from '@codemirror/lang-css';
import { javascript, jsxLanguage } from '@codemirror/lang-javascript';
import {
  getIndentation,
  IndentContext,
  indentOnInput,
  indentString,
  LanguageSupport,
  syntaxHighlighting,
} from '@codemirror/language';
import { searchKeymap } from '@codemirror/search';
import { EditorSelection, EditorState, Text, Transaction } from '@codemirror/state';
import { drawSelection, EditorView, KeyBinding, keymap, lineNumbers, ViewUpdate } from '@codemirror/view';
import { parseMixed } from '@lezer/common';
import { classHighlighter } from '@lezer/highlight';

type KeyBindings = KeyBinding | readonly KeyBinding[];

/** JSX including syntax for CSS nested in <style> tags. */
export function jsxMixed(){
  return new LanguageSupport(jsxLanguage.configure({
    wrap: parseMixed((ref, input) => {
      if(ref.name != "JSXElement")
        return null;
    
      const { from, to } = ref.node.firstChild!;

      if(input.read(from + 1, from + 6) != "style")
        return null;

      return {
        parser: cssLanguage.parser,
        overlay: [{
          from: to,
          to: ref.node.lastChild!.from
        }]
      };
    }),
  }))
}

export { javascript };

export const code = () => [
  syntaxHighlighting(classHighlighter),
  lineNumbers()
]

/** Set editor to read-only */
export const readOnly = () => [
  EditorView.editable.of(false)
]

/** Default editor extensions */
export const editor = () => [
  autoCloseTab(),
  autoElementSplit(),
  history(),
  indentOnInput(),
  closeBrackets(),
  drawSelection(),
  keyBind(
    closeBracketsKeymap,
    defaultKeymap,
    searchKeymap,
    historyKeymap,
    indentWithTab
  )
]

/** Register keymap helper */
export function keyBind(...args: KeyBindings[]){
  return keymap.of([].concat(...args as any[]));
}

/** Callback on specified keyboard event. */
export function onKey<T extends string>(
  key: T, action: (key: T) => boolean | void){

  return keyBind({
    key,
    run(){
      return action(key) !== false;
    }
  });
}

/** Callback on specified (Cmd / Control) key event. */
export function command(
  key: string, action: (key: string) => boolean | void){

  return [
    onKey(`Meta-${key}`, action),
    onKey(`Ctrl-${key}`, action)
  ]
}

/** Callback on document update. */
export function onUpdate(callback: (update: ViewUpdate) => void){
  return EditorView.updateListener.of((update) => {
    if(update.docChanged)
      callback(update);
  })
}

/**
 * Input handler will auto-close a JSX tag when '>' is typed.
 */
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

type CommandTarget = {
  state: EditorState;
  dispatch: (transaction: Transaction) => void;
}

/**
 * Key command will line-split and indent, if cursor is between '>' and '<'.
 */
export function autoElementSplit() {
  return keyBind({
    key: "Enter",
    run(target: CommandTarget) {
      const { state } = target;

      const notBetweenTags = state.selection.ranges.find(range =>
        state.sliceDoc(range.from - 1, range.to + 1) !== "><"
      );

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