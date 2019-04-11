import React, { Component, ComponentType, createContext, createElement as create, Fragment, ReactElement } from 'react';

const { Provider: StyleContext, Consumer: StyleDeclaration } = createContext({
    push: () => void 0
});

export interface BunchOf<T> {
    [key: string]: T
}

type StylesBySelector = BunchOf<string>
type StylesByPriority = StylesBySelector[];
type StylesByQuery = BunchOf<StylesByPriority>;

const { isArray } = Array;

const Modules = new class {

    blocks = {} as StylesByQuery;

    doesProvideStyle(css: StylesByPriority | StylesByQuery){
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

export { Modules as Module }

class Compiler {

    registered = {} as BunchOf<true>;
    alreadyIncluded = {} as BunchOf<true>;

    push(
        hashID: string, 
        selectors: string[]){

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

        for(let query in Modules.blocks){
            const source = Modules.blocks[query];
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

export function Include({ hid, css }: { hid: string, css: string }){
    return create(StyleDeclaration, {} as any, (props: any) => {
        props.push(hid, css.split("; "));
        return false;
    });
}

function StyleOutput({ compiler }: { compiler: Compiler }){
    return create("style", {
        jsx: "true", global: "true",
        dangerouslySetInnerHTML: {
            __html: compiler.generate()
        }
    })
}

interface StyledApplicationProps {
    children: any[]
}

class StyledApplicationComponent extends Component<StyledApplicationProps> {
    compilerTarget?: Compiler;

    componentWillMount(){
        this.compilerTarget = new Compiler();
    }

    render(){
        const { children } = this.props || [];

        const styled_content = Array.isArray(children) ? children : [children];

        return create(Fragment, {}, 
            create(StyleContext, { value: this.compilerTarget as any }, ...styled_content),
            create(StyleOutput, { compiler: this.compilerTarget as any })
        )
    }
}

function StyledApplication<P>(input: StyledApplicationProps | ComponentType<P>){

    if(input && typeof input == "function" || input instanceof Component){
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

    const { children, ...inputProps } = input as StyledApplicationProps;
    return create(StyledApplicationComponent, input, children as any);
}

export function join(...args: string[]){
    let className = "";
    for(const name of arguments){
        if(!name) continue;
        className += " " + name
    }
    return className.slice(1)
}

export function withStyles(Root: ComponentType): ReactElement {
    return create(
        StyledApplicationComponent, 
        {} as StyledApplicationProps, 
        create(Root, {})
    )
}

export default StyledApplication;