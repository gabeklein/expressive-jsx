import { get } from '@expressive/react';
import { command, Editor, editor, jsx, jsxMixed, readOnly } from '@website/editor';

import { Document } from './Document';
import { Main } from './Main';

export class InputEditor extends Editor {
  doc = get(Document);
  main = get(Main);

  extends(){
    return [
      jsx,
      editor,
      command({
        "=": () => {
          this.main.fontSize++;
        },
        "-": () => {
          this.main.fontSize--;
        },
        "s": () => {
          this.doc.build(this.text);
        }
      })
    ];
  }
}

export class OutputJSX extends Editor {
  extends(){
    return [
      jsxMixed,
      readOnly
    ];
  }
}