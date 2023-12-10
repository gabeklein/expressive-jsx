const REGISTER = new Map();

/**
 * Register new styles for application at runtime.
 * 
 * @param {string} stylesheet - CSS to be included
 * @param {{
 *   module?: string;
 *   refreshToken?: string;
 * }} options
 * 
*/
export function css(stylesheet, options = {}){
  const { module: name = "" } = options;
  const { body } = window.document;

  let group = REGISTER.get(name);

  if(!group){
    group = new RuntimeStyle(name);

    if(name && REGISTER.size){
      const value = Array.from(REGISTER.values()).pop();

      body.insertBefore(group.styleElement, value.styleElement);
    }
    else
      body.appendChild(group.styleElement);
  }

  group.put(stylesheet, options.refreshToken);
}

class RuntimeStyle {
  /**
   * Priority chunks
   * @type {Map<string, string | boolean>[]}
   */
  chunks = [new Map()];

  constructor(name){
    this.name = name;

    const style = this.styleElement =
      document.createElement("style");

    if(name)
      style.setAttribute("module", name);

    REGISTER.set(name, this);
  }

  /** Current aggregate of styles. */
  get text(){
    const output = [];

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
   * @param {string} css - plain CSS to be included
   * @param {string} [refreshToken] - optional token to refresh existing styles
   */
  put(css, refreshToken){
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

  /**
   * Accept new styles for inclusion in generated stylesheet.
   * 
   * @param {string} css - plain CSS to be included
   * @param {number} priority - priority of styles
   * @param {string} [sourceKey] - optional token to refresh existing styles
   */
  accept(css, priority, sourceKey){
    const register = this.chunks[priority] || (
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