import Model, { has, use } from '@expressive/react';
import { Editor } from '@website/editor';

import { Document } from './Document';

declare global {
  interface Window {
    editor: Main;
  }
}

declare namespace Main {
  type Layout = "compact" | "fill" | "code" | "view";
}

class Main extends Model {
  document = use(Document);

  editors = has(Editor, editor => {
    const doc = this.document;

    switch (editor.constructor.name) {
      case "InputEditor":
        doc.get(x => { editor.text = x.input })
        break;
      case "OutputJSX":
        doc.get(x => { editor.text = x.output })
        break;
    }
  });

  fontSize = 15;
  layout: Main.Layout = "compact";
  options = {
    output: "jsx",
    printStyle: "pretty"
  }
}

export { Main }