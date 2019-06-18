import React, { Component, ComponentType, createContext, createElement as create, Fragment, ReactElement } from 'react';

// const { Provider: StyleContext, Consumer: StyleDeclaration } = 
//     createContext({ push: () => void 0 });

export interface BunchOf<T> {
    [key: string]: T
}

type StylesBySelector = BunchOf<string>
type StylesByPriority = StylesBySelector[];
type StylesByQuery = BunchOf<StylesByPriority>;

const { isArray } = Array;

class Modules {

    include = [] as string[];
    blocks = {} as StylesByQuery;

    doesProvideStyle(
        css: StylesByPriority | StylesByQuery
    ){
        if(isArray(css))
            css = { default: css };

        const [ anyGivenValue ] = Object.values(css);

        if(isArray(anyGivenValue) == false)
            css = { default: [ css ] } as unknown as StylesByQuery;
            
        for(let media in css){
            const styles = css[media];
            const target = 
                media in this.blocks
                    ? this.blocks[media] 
                    : this.blocks[media] = [];

            for(const selector in styles){
                const mediaTarget = 
                    selector in target
                        ? target[selector]
                        : target[selector] = {};

                Object.assign(mediaTarget, styles[selector])
            }
        }
    }
}

class Compiler {

    registered = {} as BunchOf<true>;
    alreadyIncluded = {} as BunchOf<true>;

    push(
        hashID: string, 
        selectors: string[]
    ){
        const { registered, alreadyIncluded } = this;
        
        if(hashID in alreadyIncluded) return;

        for(const x of selectors)
            if(x in registered == false)
                registered[x] = true;
                
        alreadyIncluded[hashID] = true; 

        // if(this.outputElement) 
        //     this.outputElement.setState({
        //         mostRecentBlock: hashID
        //     }) 
    }

    generate(){
        let output = `\n`;
        const { registered } = this;

        for(const style of Module.include)
            output += style + "\n"

        for(let query in Module.blocks){
            const source = Module.blocks[query];
            let block = "";

            if(query == "default")
                query = "";

            for(let src, i = 0; src = source[i]; i++){
                if(query) block += "\t";
                block += `/* importance: ${ source.length - i } */\n`;

                for(const select of Object.keys(src).sort()){
                    const styles = /* registered[select] && */ src[select];
                    if(styles){
                        if(query) block += "\t"
                        block += `${select} { ${styles} }\n`;
                    }
                }
            }

            output += query
                ? `@media ${query} {\n ${block} } \n}`
                : `${block}\n`
        }

        return output.length > 1 && output || "";
    }
}

interface StyledApplicationProps {
    children: any[]
}

class StyledApplicationComponent 
    extends Component<StyledApplicationProps> {

    compilerTarget?: Compiler;

    componentWillMount(){
        this.compilerTarget = new Compiler();
    }

    render(){
        const { children } = this.props || [];

        const styled_content = Array.isArray(children) ? children : [children];

        return create(Fragment, {}, 
            // create(
            //     StyleContext, 
            //     { value: this.compilerTarget as any }, ...styled_content
            // ),
            ...styled_content,
            create("style", {
                jsx: "true", 
                global: "true",
                dangerouslySetInnerHTML: {
                    __html: this.compilerTarget!.generate()
                }
            })
        )
    }
}

function StyledApplication<P>(
    input: StyledApplicationProps | ComponentType<P>
){
    if(input  
    && input instanceof Component
    || typeof input == "function"){
        return (props: P) => (
            create(
                StyledApplicationComponent, 
                {} as StyledApplicationProps, 
                create(
                    input as ComponentType<P>, 
                    props
                )
            )
        )
    }

    else {
        const { children, ...props } = input;
        return create(
            StyledApplicationComponent, 
            props as any, 
            children
        );
    }
}

StyledApplication.include = (cssText: string) => {
    const indentMatch = /^\n( *)/.exec(cssText);

    if(indentMatch){
        const trim = new RegExp(`\n${indentMatch[1]}`, "g");
        cssText = cssText.replace(trim, "\n");
    }

    cssText = cssText.replace(/^\n/, "").replace(/\s+$/, "");

    Module.include.push(cssText);
}

// export function Include(
//     { hid, css }: { hid: string, css: string }
// ){
//     return create(
//         StyleDeclaration, 
//         {} as any, 
//         (props: any) => {
//             props.push(hid, css.split("; "));
//             return false;
//         }
//     );
// }

export function body(props: { children: any | any[] }){
    return [].concat(props.children)
}

export function join(...args: string[]){
    return args.filter(x => x).join(" ");
}

export function withStyles(
    Root: ComponentType
): ReactElement {
    return create(
        StyledApplicationComponent, 
        {} as StyledApplicationProps, 
        create(Root, {})
    )
}

export const Module = new Modules();

export { withStyles as withStyle }

export default StyledApplication;