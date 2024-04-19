import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { indentOnInput, syntaxHighlighting } from '@codemirror/language';
import { searchKeymap } from '@codemirror/search';
import { drawSelection, EditorView, KeyBinding, keymap, lineNumbers, ViewUpdate } from '@codemirror/view';
import { classHighlighter } from '@lezer/highlight';

import { autoCloseTab, autoElementSplit } from './pluginsJSX';
import { Extension } from '@codemirror/state';

type KeyBindings = KeyBinding | readonly KeyBinding[];

const code = () => [
  syntaxHighlighting(classHighlighter),
  lineNumbers()
]

/** Set editor to read-only */
export const readOnly = () => [
  code(),
  EditorView.editable.of(false)
]

/** Default editor extensions */
export const editor = () => [
  code(),
  history(),
  autoCloseTab(),
  autoElementSplit(),
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
    key, run: () => action(key) !== false
  });
}

type Action = (key: string) => boolean | void;

/** Callback on specified (Cmd / Control) key event. */
export function command(key: string, action: Action): Extension[];
export function command(keys: Record<string, Action>): Extension[];
export function command(
  key: string | Record<string, Action>,
  action?: Action){

  if(typeof key === "object")
    return Object.entries(key).map(([key, action]) => command(key, action));

  if(action)
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