import { dev, version } from "./develop";

export class RuntimeStyleController {
  element?: HTMLStyleElement;
  chunks = new Map<string, boolean | string>();

  constructor(){
    try {
      const tag
        = this.element
        = document.createElement("style");

      if(dev)
        tag.setAttribute("expressive", version);

      document.body.appendChild(tag);
    }
    catch(err){}
  }

  get cssText(){
    const output = Array.from(this.chunks.keys()).join("\n\n");
    return output ? `\n${output}\n` : "";
  }

  /**
   * Apply styles from cssText to generated stylesheet.
   *
   * @param cssText - plain CSS to be included
   * @param reoccuringKey - dedupe identifier (for HMR or potentially dynamic style)
   */
  put(cssText: string, reoccuringKey: string){
    const { element: ref, chunks: existing } = this;

    cssText = format(cssText);

    if(existing.has(cssText))
      return;

    if(reoccuringKey)
      for(const [text, key] of existing)
        if(key === reoccuringKey)
          existing.delete(text);

    this.chunks.set(cssText, reoccuringKey || true);

    if(ref)
      ref.innerHTML = this.cssText;
    else
      throw new Error("Tried to insert, but target <style> not found!");
  }
}

/**
* Reindent CSS text and register for inclusion.
*/
function format(cssText: string){
  const regularIndent = /^\n(\s*)/.exec(cssText);
 
  if(regularIndent){
    const trim = new RegExp(`\n${ regularIndent[1] }`, "g");
    cssText = cssText.replace(trim, "\n\t");
  }
 
  return cssText
    .replace(/^\n/, "")
    .replace(/\s+$/, "");
 }