
const t = require('babel-types')
const { html_tags_obvious } = require('./html-types');
const { Shared, Opts, transform } = require("./shared");
const { ChildNonComponent, Prop, Style } = require("./item")
const { ComponentGroup } = require("./component")

const ELEMENT_TYPE_DEFAULT = t.stringLiteral("div");

export function CollateInlineComponentsTo(parent, path){

    if(path.node 
    && path.node.extra
    && path.node.extra.parenthesized === true)
        return new ChildNonComponent(path)

    let props = [];

    if(path.isSequenceExpression())
        [path, ...props] = path.get('expressions');

    if(path.isBinaryExpression({operator: ">"})){
        const item = Object.create(path.get("right"));
        item.type = "ChildLiteral";
        props.push(item);
        path = path.get("left")
    }

    const stack = [{props}];

    while(path.isBinaryExpression({operator: ">>"})){
        stack[0].path = path.get("right")
        path = path.get("left")
        stack.unshift({})
    }
    stack[0].path = path;

    for(const {path, props} of stack){

        if(path.node == undefined)
            throw path.buildCodeFrameError("Invalid child has no value")

        if(path.node.extra && path.node.extra.parenthesized === true)
            throw path.buildCodeFrameError("Children in Parenthesis are not allowed, for direct insertion used an Array literal")

        if(path.type == "TemplateLiteral")
            throw path.buildCodeFrameError("Template literal is not a valid element")

        const child = new ComponentInline(path, parent)

        InlineLayers.apply(child, path);
        InlineProps.applyTo(child, props);

        parent.add(child);
        parent = child;
    }
}

const InlineLayers = {

    apply(target, tag){

        const { default_type_text } = Opts;

        if(tag.isBinaryExpression({operator: "-"})){
            const left = tag.get("left")
            if(left.isIdentifier())
                target.prefix = left.node.name
            else
                left.buildCodeFrameError("Improper element prefix");
            tag = tag.get("right")
        }

        while(!tag.node.extra && tag.type in this)
            tag = this[tag.type].call(target, tag);

        if(tag.isIdentifier())
            target.class.push({name: tag.node.name, path: tag, head: true})

        else if(tag.isStringLiteral() || tag.isTemplateLiteral()){
            target.class.push({name: default_type_text, node: type_text, head: true})
            target.add(new ChildNonComponent(tag))
        }

        else throw tag.buildCodeFrameError("Expression must start with an identifier")

    },

    TaggedTemplateExpression(tag){
        ChildNonComponent.applyTo(this, 
            tag.get("quasi")
        )
        const stripped = tag.get("tag");
        //temportary means of preventing ES6 transformer from creating corresponding shim.
        // tag.replaceWith(stripped.node)
        return stripped
    },

    CallExpression(tag){
        const args = tag.get("arguments");
        InlineProps.applyTo(this, args)
        return tag.get("callee");
    },

    MemberExpression(tag){

        const selector = tag.get("property");

        if(tag.node.computed === true)
            throw selector.buildCodeFrameError("Due to how parser works, a semicolon is required after the element preceeding escaped children.")

        this.class.push({
            name: selector.node.name, 
            path: selector
        })

        return tag.get("object");
    }
}

var util = require('util');

class InlineProps extends Prop {
    inlineType = "attrs"
    precedence = 0

    static applyTo(target, props){
        if(!props) return;
        for(let path of props){
            switch(path.type){
                case "DoExpression":
                    if(target.body) throw path.buildCodeFrameError("Do Expression was already declared!")
                    target.body = path;
                    target.scope = path.get("body").scope;
                    path.node.meta = target;
                break;

                case "StringLiteral":
                    debugger
                case "TemplateLiteral":
                case "ChildLiteral":
                    target.add(new ChildNonComponent(path))
                break;

                default: 
                    target.add(new this(path))
            }
        }
    }

    get computed(){
        const { path } = this;
        const { node, type } = path;
        let name, value;

        if(!type) debugger

        switch(type){
            case "TaggedTemplateExpression": {
                const {tag, quasi} = path.node;

                if(tag.type != "Identifier") 
                    throw path.buildCodeFrameError("Prop must be an Identifier");

                name = tag.name
                value = path.get("quasi");

                //collapsing prevents down-line transformers from adding useless polyfill
                //replaced instead of removed because value itself must remain in-line to receive legitiment transforms
                path.replaceWith(value)

                break;
            }

            case "UnaryExpression": {
                const { operator: op } = node;
                const target = { "+": "props", "~": "style" }[op];
                if(!target) throw path.buildCodeFrameError(`"${op}" is not a recognized operator for props`)

                value = path.get("argument")
                this.kind = target;
                this.isSpread = true;
                break;
            }

            case "Identifier": 
                name = node.name
                value = {
                    node: t.booleanLiteral(true)
                }
            break;

            case "AssignmentExpression": {
                if(node.operator != "=")
                    throw path.get("operator").buildCodeFrameError("Props may only be assigned with `=` or using tagged templates.");

                const left = path.get("left");
                if(left.isMemberExpression())
                    throw left.buildCodeFrameError("Member Expressions can't be prop names");

                if(node.left.type == "Identifier")
                    name = node.left.name;

                else path.get("left").buildCodeFrameError("Prop assignment only works on an identifier to denote name")

                value = path.get("right")

                break;
            } 

            case "SpreadElement": {
                value = path.get("argument")

                const arg = node.argument;
                let spread = "inclusion"
                if(t.isIdentifier(arg))
                    spread = arg.name;
                throw path.buildCodeFrameError(`Spread Element depreciated, use \`+${spread}\` instead.`)
            }

            case "ArrowFunctionExpression": {
                value = path;
                name = "callback"
                break;
            }

            default:
                debugger
                throw path.buildCodeFrameError(`There is no such property inferred from an ${type}.`)
        }

        this.path_value = value;

        this.type = type;
        this.name = name;
    }

    get value(){
        if(!this.path_value){
            debugger
            throw new Error("Prop has no path_value set, this is an internal error")
        }
        return this.path_value.node;
    }

    // get value(){
    //     const {target, type, path: { node }} = this;
    //     let thing;

    //     if(target)
    //         thing = node.argument;

    //     switch(type){
    //         case "TaggedTemplateExpression":
    //             thing = this.quasi.node;
    //             break;

    //         case "AssignmentExpression":
    //             thing = node.right
    //             break;

    //         case "Identifier":  
    //             thing = t.booleanLiteral(true)
    //             break;
    //     }
        
    //     return thing
    // }
}

export class ComponentInline extends ComponentGroup {

    inlineType = "child"

    props = []
    style = []
    attrs = []
    class = []
    segue = 0
    precedence = 3
    // doesReceive = {}

    constructor(path, parent){
        super(path, parent)

        this.classifiedStyles = {};
        this.scope = path.get("body").scope;
        this.context = parent.context
    }

    insertDoIntermediate(){ /*ExternalProps does binding to existing one.*/ }

    didEnterOwnScope(path){
        super.didEnterOwnScope(path)
    }

    didExitOwnScope(){
        // this.transform = this.body
        //     ? this.outputDynamic
        //     : thsi.outputInline;
    }

    mayReceiveAttributes(style, props){
        ({ style = style, props = props } = this.doesReceiveDynamic || {});
        this.doesReceiveDynamic = { style, props };
    }

    seperateItems(inline, dynamic){
        let output = [];
        let layer = [];
        for(const style of inline)
            if(style.type == "SpreadProperty"){
                if(layer.length) output.push(t.objectExpression[layer])
                output.push(style.argument);
                layer = [];
            }
            else layer.push(style)

        if(layer.length) output.push(t.objectExpression(layer))
        if(dynamic) output.push(dynamic)

        return output;
    }

    standardCombinedStyleFormatFor(inline, dynamic){
        if(Opts.applicationType == "native"){
            let output = this.seperateItems(inline, dynamic);

            if(output.length == 1){
                output = output[0]
                if(output.type == "SpreadElement") return output.argument;
                else return output
            }
            else return t.arrayExpression(output)

        } else{
            if(dynamic) inline.push(t.spreadProperty(dynamic))
            return t.objectExpression(inline);
        }

        
    }

    standardCombinedPropsFormatFor(inline, dynamic){
        let output = this.seperateItems(inline, dynamic);
        if(output.length < 2){
            return output[0] || t.objectExpression([])
        } else {
            return t.callExpression(
                Shared.extends,
                output
            )
        }
    }

    typeInformationAppliedTo(inline_attributes){ 

        const _classNames = [];
        let _type = ELEMENT_TYPE_DEFAULT, _className;

        for(const item of this.class){
            const {name} = item;
            const include = this.context[name];
 
            if(include) 
                include.into(inline_attributes, _classNames)

            else if(item.head == true){
                if(/^[A-Z]/.test(name))
                    _type = t.identifier(name)
                else {
                    if(this.prefix == "html" || html_tags_obvious.has(name))
                        _type = t.stringLiteral(name);
                    else 
                        _classNames.push(name);
                }
            }

            else _classNames.push(name)
        }

        if(_classNames.length) 
            _className = 
                t.objectProperty(
                    t.identifier("className"),
                    t.stringLiteral(_classNames.reverse().join(" "))
                )

        return { _className, _type };

    }

    transform(){

        const  _init = [];
        let _style, _props;

        const { scope, doesReceiveDynamic } = this;

        const inline = {
            props: [], 
            style: []
        }

        let { _type, _className } = this.typeInformationAppliedTo(inline)

        let _propsPassed = t.objectExpression(inline.props);
        let _stylePassed;
        
        if(this.attrs.length)
            for(const attr of this.attrs)
                inline[attr.kind || "props"].push(
                    attr.asProperty
                )

        if(this.disordered || this.stats.length || doesReceiveDynamic){

            if(_type.type == "Identifier"){
                const existing = scope.getBinding(_type.name);
                if(existing && 0 > ["const", "module"].indexOf(
                   existing.kind
                )){
                    const _actualType = _type;
                    _type = scope.generateUidIdentifier("t");
                    _init.push(
                        t.variableDeclarator(_type, _actualType)
                    )
                }
            }

            const acc = this.context._accumulate = {};

            if(this.style.length || doesReceiveDynamic && doesReceiveDynamic.style){
                _style
                    = acc.style 
                    = scope.generateUidIdentifier("s");
                _init.push(
                    t.variableDeclarator(_style, t.objectExpression([]))
                )
            }
            if(inline.style.length){
                _stylePassed = scope.generateUidIdentifier("ss");
                _init.push(
                    t.variableDeclarator(
                        _stylePassed, 
                        this.standardCombinedStyleFormatFor(inline.style, _style)
                    )
                )
            } else {
                _stylePassed = _style
            }

            if(this.props.length || doesReceiveDynamic && doesReceiveDynamic.props){
                _props
                    = acc.props
                    = scope.generateUidIdentifier("p");
                _init.push(
                    t.variableDeclarator(_props, this.standardCombinedPropsFormatFor(inline.props))
                )
                _propsPassed = _props;
            } 
            else if(_stylePassed){
                inline.props.push(t.objectProperty(t.identifier("style"), _stylePassed))
            }
        } else {
            if(this.props.length)
                inline.props.push(...this.props.map(x => x.asProperty))
            inline.style.push(...this.style.map(x => x.asProperty));
            if(inline.style.length){
                inline.props.push(t.objectProperty(
                    t.identifier("style"), 
                    this.standardCombinedStyleFormatFor(inline.style)
                ))
            }
        }

        if(_className) inline.props.push(_className);

        const _quoteTarget = { props: _props, style: _style };
        const { output, body } = this.collateChildren( 
            (x) => {
                const target = _quoteTarget[x.inlineType];
                if(target) return x.asAssignedTo(target);
            }
        );

        const stats = [];

        if(_init.length) stats.push(
            t.variableDeclaration("const", _init)
        )

        stats.push(...body)

        if(t.isIdentifier(_props) && _stylePassed)
            stats.push(
                t.expressionStatement(
                    t.assignmentExpression("=",
                        t.memberExpression(_props, t.identifier("style")), _stylePassed
                    )
                )
            )

        const product = transform.createElement( _type, this.standardCombinedPropsFormatFor(inline.props, _props), ...output )

        if(stats.length) {
            const id = this.scope.generateUidIdentifier("e");

            const factory = [
                transform.declare("let", id),
                t.blockStatement([
                    ...stats,
                    t.expressionStatement(
                        t.assignmentExpression("=", id, product)
                    )
                ])
            ]
            return { product: id, factory }
        }
        else return { product }
    }

    
}

