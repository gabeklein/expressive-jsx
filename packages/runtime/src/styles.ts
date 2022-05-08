declare namespace RuntimeStyle {
  interface PutOptions {
    module?: string;
    refreshToken?: string;
  }
}

class RuntimeStyle {
  /** <style> tag expressing accumulated styles  */
  styleElement: HTMLStyleElement;

  /** Priority chunks */
  chunks = [
    new Map<string, boolean | string>()
  ];

  constructor(public name: string){
    const style = this.styleElement =
      document.createElement("style");

    if(name)
      style.setAttribute("module", name);
  }

  /** Current aggregate of styles. */
  get text(){
    const output: string[] = [];

    for(const chunk of this.chunks)
      if(chunk)
        output.push(...chunk.keys());

    if(!output.length)
      return "";

    const css = output
      .map(x => x.replace(/\n$/, ""))
      .join("\n")

    return `\n${css}\n`;
  }

  /**
   * Add styles from cssText to generated stylesheet.
   *
   * @param css - plain CSS to be included
   * @param options
   */
  put(css: string, refreshToken?: string){
    const indent = /^\n(\s*)/.exec(css);
   
    if(indent){
      const line_offset = new RegExp("\n" + indent[1], "g");
      css = css.replace(line_offset, "\n");
    }

    const groups = css
      // remove empty lines
      .replace(/^\n/, "")
      // remove trailing whitespace
      .replace(/\s+$/, "")
      // split priorty chunks (if exist)
      .split(/\/\* (\d+) \*\/\n/g);

    if(groups[0] === "")
      groups.shift();

    if(groups.length < 2)
      groups.unshift("0");

    for(let i=0; groups.length > i; i+=2)
      this.accept(groups[i+1], Number(groups[i]), refreshToken);

    this.styleElement.innerHTML = this.text;
  }

  accept(css: string, priority: number, sourceKey?: string){
    let register = this.chunks[priority] || (
      this.chunks[priority] = new Map()
    )

    if(register.has(css))
      return;

    if(sourceKey)
      for(const [text, key] of register)
        if(key === sourceKey)
          register.delete(text);

    register.set(css, sourceKey || true);
  }
}

export { RuntimeStyle }