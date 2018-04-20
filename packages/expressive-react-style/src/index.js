//needed only to prevent a webpack "no instrumentation found" error
import { hot } from 'react-hot-loader'

import PropTypes from 'prop-types';
import { Component, createElement, Fragment } from "react";

export const Cache = new class {

    blocks = {};

    moduleDoesYieldStyle(fromFile, css){
        css = css
            .substring(2)
            .split(/\n\t*/g)
            .slice(0, -1)
            .map(x => x.split(/(?= \{ )/));

        for(const [selector, rules] of css){
            this.blocks[selector] = rules
        }
    }

    get(selector){
        return this.blocks["." + selector];
    }
}

class Compiler {
    registered = {};
    knownBlocks = {};

    push(hashID, classNames){
        const { registered, parent, knownBlocks, outputElement } = this;

        if(!knownBlocks[hashID]){
            if(outputElement) 
                outputElement.setState({
                    mostRecentBlock: hashID
                })
            knownBlocks[hashID] = true;
            for(const x of classNames)
                if(!registered[x]){
                    registered[x] = true;
                }
        }
    }

    generate(){
        let output = `\n`;

        for(const select in this.registered){
            output += `\t.` + select + Cache.get(select) + `\n`;
        }

        if(output.length > 1)
            return output;
        else 
            return "";
    }
}

export class Enable extends Component {

    static contextTypes = {
        compiler: PropTypes.instanceOf(Compiler)
    }

    declareStyles(){
        const { context, props } = this;
        const { hid, css } = props;

        context.compiler.push(hid, css.split(", "))
    }

    render(){
        this.declareStyles();
        return null
    }
}

class StyledOutput extends Component {

    componentWillMount(){
        this.props.compiler.outputElement = this;
    }

    render(){
        return createElement("style", {
            jsx: "true",
            global: "true",
            dangerouslySetInnerHTML: {
                __html: this.props.compiler.generate()
            }
        })
    }
}

class StyledContent extends Component {
    render(){
        return [].concat(this.props.content)
    }
}

export default class StyledApplication extends Component {

    static propTypes = {
        children: PropTypes.oneOfType([
            PropTypes.arrayOf(PropTypes.node),
            PropTypes.node
        ])
    }

    static childContextTypes = {
        compiler: PropTypes.object
    }

    constructor(props, context) {
        super(props, context);
        this.state = {
            compiler: new Compiler(this)
        }
    }

    getChildContext(){
        return {
            compiler: this.state.compiler
        };
    }

    render(){
        const { compiler } = this.state;
        const children = [].concat(this.props.children);
        //  Provider which listens to build-time placed style claims.

        return createElement(Fragment, {},
            /*
            Children of Styled Application are passed forward with style
            useage logged for subsequent style complication.

            Claims (Enable) are automatically inserted at build-time
            to inform StyledApplication which styles need to be included 
            from cache. This tree-shakes the cache which contains all 
            styles computed from all required modules, application-wide, 
            which may or may not not be used for a given page build. 
            */

            ...children,

            /*
            Generated style element containing all selectors needed for given 
            page render. Output pulls style rules from cache while only
            including those which were "claimed" by elements generated within
            the StyleRegister's context.
            */
           createElement(StyledOutput, {
               compiler
           })
        )
    }
}