import { get } from '@expressive/react';
import { code, command, Editor, editor, javascript, jsxMixed, lineNumbers, readOnly } from '@website/editor';

import { Document } from './Document';
import { Main } from './Main';

export class InputEditor extends Editor {
  doc = get(Document);
  main = get(Main);

  extends(){
    const { main, doc } = this;

    return [
      code(),
      editor(),
      lineNumbers(),
      javascript({ jsx: true }),
      command("=", () => { main.fontSize++ }),
      command("-", () => { main.fontSize-- }),
      command("s", () => {
        doc.build(this.text);
      })
    ];
  }
}

export class OutputJSX extends Editor {
  extends(){
    return [
      code(),
      lineNumbers(),
      jsxMixed(),
      readOnly()
    ];
  }
}