interface BunchOf<T> {
    [key: string]: T
}

const arrayPushMethod = Array.prototype.push;
const valuesOf = Object.values;

// allowing subsequent calls to override previous ones. Intended to prevent duping, especially on hot reloads.

const StyleSheet = new class RuntimeStyleController {
    chunks = {} as BunchOf<string>;
    contentIncludes = {} as BunchOf<boolean | string>;
    ref?: HTMLStyleElement;

    constructor(){
        Object.defineProperty(this.chunks, "length", {
            enumerable: false,
            writable: true
        })

        window.addEventListener('load', () => {
            const tag 
                = this.ref 
                = document.createElement("style");
    
            tag.setAttribute("expressive", "");
            tag.innerHTML = this.cssText;
    
            document.body.appendChild(tag);
        }, false);
    }

    /**
     * Apply styles from cssText to generated stylesheet.
     * 
     * @param cssText - plain CSS to be included
     * @param reoccuringKey - dedupe identifier (for HMR or potentially dynamic style)
     */
    shouldInclude(cssText: string, reoccuringKey: string){
        if(this.ref)
            this.include(cssText, reoccuringKey)
        else
            this.apply(cssText, reoccuringKey)
    }

    get cssText(){
        let output = valuesOf(this.chunks).join("\n\n");
        return output ? `\n${output}\n` : "";
    }

    /**
     * Inlcude cssText in rendered <style>.
     * 
     * Will bail if cssText already exists, and overwrite chunks which share `reoccuringKey`.
     */
    private include(cssText: string, reoccuringKey: string){
        const existing = this.contentIncludes;

        if(cssText in existing)
            return
        else {
            if(reoccuringKey)
            for(const text in existing)
            if(reoccuringKey === existing[text])
                delete existing[text];
        }

        this.apply(cssText, reoccuringKey)
        this.ref!.innerHTML = this.cssText;
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

export { 
    body,
    join
}

export default StyleSheet;