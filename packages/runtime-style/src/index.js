//needed only to prevent a webpack "no instrumentation found" error

import { hot } from 'react-hot-loader'
import { Component, createElement, Fragment, createContext } from "react";

const { Provider: StyleContext, Consumer: StyleDeclaration } = createContext({
    push(){
        return;
    }
});

// import StyledOutput from "./output"

export const Cache = new class {

    blocks = {};

    moduleDoesYieldStyle(_fromFile, css){
        for(let media in css){
            const styles = css[media];
            const target = this.blocks[media] || (this.blocks[media] = []);
            for(const selection in styles)
                Object.assign(target[selection] || (target[selection] = {}), styles[selection])
        }
    }
}

class Compiler {
    registered = {};
    alreadyIncluded = {};

    push(hashID, selectors){
        const { registered, parent, alreadyIncluded, outputElement } = this;
        if(alreadyIncluded[hashID]) return; 
        alreadyIncluded[hashID] = true;
        
        for(const x of selectors)
            if(!registered[x])
                registered[x] = true;

        if(outputElement) 
            outputElement.setState({
                mostRecentBlock: hashID
            }) 
    }

    generate(){
        let output = `\n`;
        const { registered } = this;

        for(const query in Cache.blocks){
            const source = Cache.blocks[query];
            const noMedia = query == "default";
            let mediaStyles = "";

            for(let block, i = 0, l = source.length; block = source[i]; i++){
                mediaStyles += `${noMedia ? '' : "\t"}/* importance: ${ l - i } */\n`
                for(const select of Object.keys(block).sort()){
                    const styles = registered[select] && block[select];
                    if(styles){
                        mediaStyles += (noMedia ? "" : "\t") + select + " { " + styles + " }" + `\n`;
                    }
                }
            }

            if(noMedia){
                output += mediaStyles + "\n";
            } else {
                output += `@media ${ query } {\n ${mediaStyles} \n}`;
            }
        }

        if(output.length > 1)
            return output;
        else 
            return "";
    }
}

export const Include = ({ hid, css }) => 
    createElement(StyleDeclaration, {}, compiler => {
        compiler.push(hid, css.split(", "));
        return false;
    });

const StyleOutput = ({ compiler }) => 
    createElement("style", {
        jsx: "true", global: "true",
        dangerouslySetInnerHTML: {
            __html: compiler.generate()
        }
    })


export default class StyledApplication extends Component {
    
    componentWillMount(){
        this.compilerTarget = new Compiler(this);
    }
    
    render(){
        const styled_content = [].concat(this.props.children || []);
        return createElement(Fragment, {}, 
            createElement(StyleContext, { value: this.compilerTarget }, ...styled_content),
            createElement(StyleOutput, { compiler: this.compilerTarget })
        )
    }
}