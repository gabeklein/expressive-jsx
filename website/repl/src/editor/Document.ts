import Model from '@expressive/react';
import React from 'react';

import { evaluate, hash, prettify, transform } from './transform';

const DEFAULT_CODE =
`export const Hi = () => {
  color: red;
  fontSize: 2.0;

  <this>Hello World!</this>
}`

export class Document extends Model {
  input = "";
  output_jsx = "";
  output_css = "";

  key = 0;
  Preview: React.FC | undefined;

  stale = false;
  error = "";

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
      const pretty = prettify(jsx);
      const Component = evaluate(jsx);

      this.error = "";
      this.input = from;
      this.key = hash(from);
      this.output_css = css;
      this.output_jsx = pretty;
      this.Preview = Component;
      this.stale = false;
    }
    catch(error){
      console.error(error);
      this.error = "Error while compiling module.";
    }
  }
}