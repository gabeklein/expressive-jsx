import Model from '@expressive/react';

import { evaluate, PreviewComponent } from './evaluate';
import { hash, transform } from './transform';

const DEFAULT_CODE =
`export const Hi = () => {
  color: red;
  fontSize: 2.0;

  <this>
    Hello World!
  </this>
}`

export class Document extends Model {
  input = "";
  output = "";

  stale = false;
  error = "";

  key = 0;
  Preview?: PreviewComponent = undefined;

  constructor(){
    super(() => {
      this.build(localStorage.getItem("REPL:file") || DEFAULT_CODE);
    });
  }

  onError = (error: Error) => {
    this.error = error.toString();
    console.error(error);
  }

  build(from: string){
    try {
      const { jsx, css } = transform(from);
      const Component = evaluate(from);

      this.error = "";
      this.input = from;
      this.stale = false;
      this.key = hash(from);
      this.output = jsx;

      if(css){
        const format = css
          .replace(/^|\t/g, "  ")
          .replace(/\n/g, "\n  ");
  
        this.output += `\n\n<style>\n${format}\n</style>`;
      }

      this.Preview = Component;
    }
    catch(error){
      console.error(error);
      this.error = "Error while compiling module.";
    }
  }
}