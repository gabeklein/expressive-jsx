import { dev, version } from "./develop";

export class RuntimeStyleController {
  element?: HTMLStyleElement;
  chunks = [ new Map<string, boolean | string>() ];

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
    const output: string[] = [];

    for(const chunk of this.chunks){
      if(!chunk)
        continue;
      
      output.push(...chunk.keys());
    }

    const css = output
      .map(x => x.replace(/\n$/, ""))
      .join("\n")

    if(output.length)
      return `\n${css}\n`;
    
    return "";
  }

  refresh(){
    const { element } = this;

    if(element)
      element.innerHTML = this.cssText;
    else
      throw new Error("Tried to insert, but target <style> not found!");
  }

  /**
   * Apply styles from cssText to generated stylesheet.
   *
   * @param cssText - plain CSS to be included
   * @param reoccuringKey - dedupe identifier (for HMR or potentially dynamic style)
   */
  put(cssText: string, reoccuringKey: string){
    cssText = stripIndentation(cssText);

    const byPriority = /\/\* (\d+) \*\/\n/g;
    const groups = cssText.split(byPriority);

    if(groups.length === 1)
      this.accept(cssText, 0, reoccuringKey);
    else {
      for(let i = 1; groups.length > i; i+=2)
        this.accept(groups[i+1], Number(groups[i]), reoccuringKey);
    }

    this.refresh();
  }

  accept(
    css: string,
    priority: number,
    sourceKey?: string){

    let register = this.chunks[priority];

    if(!register)
      register = this.chunks[priority] = new Map();

    if(register.has(css))
      return;

    if(sourceKey)
      for(const [text, key] of register)
        if(key === sourceKey)
          register.delete(text);

    register.set(css, sourceKey || true);
  }
}

/**
 * Reindent CSS text and register for inclusion.
 */
function stripIndentation(cssText: string){
  const regularIndent = /^\n(\s*)/.exec(cssText);
 
  if(regularIndent){
    const trim = new RegExp(`\n${ regularIndent[1] }`, "g");
    cssText = cssText.replace(trim, "\n");
  }
 
  return cssText
    .replace(/^\n/, "")
    .replace(/\s+$/, "");
 }