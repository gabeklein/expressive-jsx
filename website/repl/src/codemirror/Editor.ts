import './editor-light.css';
import './editor.css';

import { EditorState, Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { get, Model, ref, set } from '@expressive/react';
import { Main } from 'editor/Main';

export * from './plugins';

export const CIRCULAR = Symbol("INTERNAL");

export abstract class Editor extends Model {
  main = get(Main);
  view = set<EditorView>();
  element = ref(this.createEditor);

  text = "";

  update(text: string){
    this.text = text;
    this.set(CIRCULAR);
  }

  protected abstract extends(): Extension;

  protected createEditor(parent: HTMLDivElement){
    const state = EditorState.create({ extensions: this.extends() });
    const view = this.view = new EditorView({ parent, state });
    const done = this.get(({ text }, update) => {
      if(update.has(CIRCULAR))
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