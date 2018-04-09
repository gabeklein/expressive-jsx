
import PropTypes from 'prop-types';
import { Component, createElement, Fragment } from "react";

export class Enable extends Component {
    static contextTypes = {
        compiler: PropTypes.object.isRequired
    }

    constructor(props, context) {
        super(props, context)
    }

    render(){
        const { context, props } = this;
        const { didRender } = props;

        if(context.compiler)
            context.compiler.push(props.css.split(", "))

        if(didRender) didRender();
        return null
    }
}

/*
    Singleton class keeps track of all computed styles 
    import/required from expressive-transformed modules.
*/

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
    registered = {}

    constructor(inBody) {
        this.parent = inBody;
    }

    push(classNames){
        const { registered, parent } = this;
        for(const x of classNames)
            if(!registered[x]){
                registered[x] = true;
                // parent.setState({
                //     styleOutput: parent.state.styleOutput + `\t.` + select + Cache.get(select) + `\n`
                // })
            }
    }

    generate(){
        let output = `\n`;

        for(const select in this.registered){
            output += `\t.` + select + Cache.get(select) + `\n`;
        }

        return output;
    }
}

class ApplicationBody extends Component {   

    static contextTypes = {
        compiler: PropTypes.object.isRequired
    }
    
    render(){
        return createElement("div", {id: "styledApplication"}, this.props.children || null);
    } 

    componentDidMount(){
        this.renderDidComplete()
    }

    componentDidUpdate(){
        this.renderDidComplete()
    }

    renderDidComplete(){
        this.props.stylesDidUpdate()
    }

    shouldComponentUpdate(props){
        return props.shouldContentsUpdate;
    }
}

export default class StyledApplication extends Component {

    static childContextTypes = {
        compiler: PropTypes.object
    }

    buildStyles = () => {
        this.setState({
            styleOutput: this.state.compiler.generate(),
            isUpdatingStyleNode: true,
            compiler: new Compiler()
        })
    }

    constructor(props, context) {
        super(props, context);
        this.state = {
            styleOutput: "#styledApplication { display: none }",
            compiler: new Compiler(this)
        }
    }
    
    getChildContext(){
        return {
            compiler: this.state.compiler
        };
    }

    shouldComponentUpdate(newProps, newState){
        if(this.state.isUpdatingStyleNode == true
        && newState.isUpdatingStyleNode == false)
            return false;
        else 
            return true;
    }

    componentDidUpdate(){
        if(this.state.isUpdatingStyleNode == true)
            this.setState({
                isUpdatingStyleNode: false
            })
    }

    render(){
        const { children = [] } = this.props;
        //  Provider which listens to build-time placed style claims.

        return createElement(Fragment, {},
            /*
            Generated style element containing all selectors needed for this 
            pageload. Output pulls style rules from cache while only
            including those which were "claimed" by elements generated within
            the StyleRegister's context.
            */
            createElement("style", {
                jsx: "true",
                global: "true",
                dangerouslySetInnerHTML: {
                    __html: this.state.styleOutput
                }
            }),
            /*
            Children of Styled Application are passed forward with style
            useage logged for subsequent style complication.

            Claims (EnableStyle) are automatically inserted at build=time
            to inform StyledApplication which styles need to be included 
            from cache, as cache contains all styles computed from all 
            required modules, application-wide, which may or may not not 
            be used for a given page build. 
            */
            createElement(ApplicationBody, {
                shouldContentsUpdate: !this.state.isUpdatingStyleNode,
                stylesDidUpdate: this.buildStyles
            }, children)
        )
    }
}