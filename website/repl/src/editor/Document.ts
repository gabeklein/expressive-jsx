import Model from '@expressive/react';

import { toReact, PreviewComponent } from './evaluate';
import { hash, transform } from './transform';

const DEFAULT_CODE =
`export const Hi = () => {
  fontSize: 2.0;

  <this>
    Hello World!
  </this>
}`

export class Document extends Model {
  input = "";
  output = "";
  error = "";

  key = 0;
  Preview?: PreviewComponent = undefined;

  constructor(){
    super(() => {
      this.build(
        localStorage.getItem("REPL:file") || DEFAULT_CODE
      );
    });
  }

  onError = (error: Error) => {
    this.error = error.toString();
    console.error(error);
  }

  build(source: string){
    try {
      const { jsx, css } = transform(source);
      const component = toReact(source);

      this.error = "";
      this.input = source;
      this.key = hash(source);
      this.output = jsx;

      if(css){
        const pretty = css
          .replace(/^|\t/g, "  ")
          .replace(/\n/g, "\n  ");
  
        this.output += `\n\n<style>\n${pretty}\n</style>`;
      }

      this.Preview = component;
    }
    catch(error){
      console.error(error);
      this.error = "Error while compiling module.";
    }
  }
}