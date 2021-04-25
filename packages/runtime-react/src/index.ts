import { createElement } from 'react';

interface BunchOf<T> {
  [key: string]: T
}

const { defineProperty: define } = Object;

const arrayPushMethod = Array.prototype.push;
const valuesOf = Object.values;

// allowing subsequent calls to override previous ones. Intended to prevent duping, especially on hot reloads.

const Controller = new class RuntimeStyleController {
  chunks = {} as BunchOf<string>;
  contentIncludes = {} as BunchOf<boolean | string>;
  ref?: HTMLStyleElement;

  constructor(){
    define(this.chunks, "length", {
      enumerable: false,
      writable: true
    })
    this.bootstrap();
  }

  bootstrap(){
    try {
      const tag
        = this.ref
        = document.createElement("style");

      tag.setAttribute("expressive", "");
      tag.innerHTML = this.cssText;

      document.body.appendChild(tag);
    }
    catch(err){}
  }

  get cssText(){
    const output = valuesOf(this.chunks).join("\n\n");
    return output ? `\n${output}\n` : "";
  }

  /**
   * Apply styles from cssText to generated stylesheet.
   *
   * @param cssText - plain CSS to be included
   * @param reoccuringKey - dedupe identifier (for HMR or potentially dynamic style)
   */
  include(cssText: string, reoccuringKey: string){
    const existing = this.contentIncludes;

    if(cssText in existing)
      return

    if(reoccuringKey)
      for(const text in existing)
        if(reoccuringKey === existing[text])
          delete existing[text];

    this.apply(cssText, reoccuringKey)

    try {
      this.ref!.innerHTML = this.cssText;
    }
    catch(err){}
  }

  /**
   * Reindent CSS text and register for inclusion.
   */
  private apply(cssText: string, reoccuringKey: string){
    const regularIndent = /^\n(\s*)/.exec(cssText);

    this.contentIncludes[cssText] = reoccuringKey || true;

    if(regularIndent){
      const trim = new RegExp(`\n${ regularIndent[1] }`, "g");
      cssText = cssText.replace(trim, "\n\t");
    }

    cssText = cssText
      .replace(/^\n/, "")
      .replace(/\s+$/, "");

    if(reoccuringKey)
      this.chunks[reoccuringKey] = cssText;
    else
      arrayPushMethod.call(this.chunks, cssText);
  }
}

function body(props: { children: any | any[] }){
  return [].concat(props.children)
}

function join(...args: string[]){
  return args.filter(x => x).join(" ");
}

type Accumulator = (add: (item: any) => void) => void;

function collect(fn: Accumulator){
  const acc: any[] = [];
  fn(x => acc.push(x));
  return acc;
}

export {
  body,
  collect,
  join
}

const StyleSheet = () => {
  return createElement(
    "style", {
      dangerouslySetInnerHTML: { __html: Controller.cssText }
    }
  )
}

define(StyleSheet, "include", { value: Controller.include.bind(Controller) });
define(StyleSheet, "cssText", { get: () => Controller.cssText })

export default StyleSheet;