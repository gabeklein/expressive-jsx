import './editor.css';

import { EditorState, Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { Model, ref, set } from '@expressive/mvc';

import { onUpdate } from './plugins';

/** Event is internal and ignored to avoid loop. */
const NOOP = Symbol("NOOP");

export * from './plugins';
export * from './pluginsJSX';

export abstract class Editor extends Model {
  view = set<EditorView>();
  state = set<EditorState>();
  ref = ref(this.createEditor);

  text = "";

  protected abstract extends(): (Extension | (() => Extension))[];

  protected createEditor(parent: HTMLDivElement){
    const state = this.state = EditorState.create({ 
      extensions: [
        onUpdate(({ docChanged, state }) => {
          if(docChanged){
            this.text = state.doc.toString();
            this.set(NOOP);
          }
        }),
        ...this.extends().map(ext => (
          typeof ext === "function" ? ext() : ext
        ))
      ]
    });

    const view = this.view = new EditorView({ parent, state });

    const done = this.get(({ text }, update) => {
      if(update.has(NOOP))
        return;

      view.dispatch({
        changes: {
          from: 0,
          to: view.state.doc.length,
          insert: text
        }
      });    
    });

    return () => {
      done();
      view.destroy();
    }
  }
}