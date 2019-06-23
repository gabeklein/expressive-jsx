import React, { Component, ComponentType, createContext, createElement as create, Fragment, ReactElement } from 'react';

export interface BunchOf<T> {
    [key: string]: T
}

class Modules {
    include = [] as string[];
    loaded = {} as BunchOf<string>;
}

class Compiler {
    generate(){
        let output = `\n`;

        for(const style of Module.include)
            output += style + "\n"

        for(const file in Module.loaded)
            output += Module.loaded[file] + "\n"

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
            ...styled_content,
            create("style", {
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

StyledApplication.shouldInclude = (cssText: string, module: string) => {
    const indentMatch = /^\n( *)/.exec(cssText);

    if(indentMatch){
        const trim = new RegExp(`\n${indentMatch[1]}`, "g");
        cssText = cssText.replace(trim, "\n");
    }

    cssText = cssText.replace(/^\n/, "").replace(/\s+$/, "");

    if(module)
        Module.loaded[module] = cssText;
    else
        Module.include.push(cssText);
}

export const Module = new Modules();

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

export { withStyles as withStyle }

export default StyledApplication;