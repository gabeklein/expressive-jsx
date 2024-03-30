import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { javascript } from '@codemirror/lang-javascript';
import { indentOnInput, syntaxHighlighting } from '@codemirror/language';
import { searchKeymap } from '@codemirror/search';
import { drawSelection, EditorView, KeyBinding, keymap, lineNumbers, ViewUpdate } from '@codemirror/view';
import { classHighlighter } from '@lezer/highlight';

import { autoCloseTab, autoElementSplit, jsxMixed } from './pluginsJSX';

type KeyBindings = KeyBinding | readonly KeyBinding[];

export {
  javascript,
  jsxMixed,
  lineNumbers,
};

export const code = () => [
  syntaxHighlighting(classHighlighter),
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