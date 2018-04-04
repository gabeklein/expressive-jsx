const t = require('babel-types')
const { html_tags_obvious } = require('./html-types');
const { Shared, Opts, transform } = require("./shared");
const { ChildNonComponent, Prop } = require("./item")
const { ComponentGroup } = require("./component")
const { createHash } = require('crypto');

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
    precedent = 0
    precedence = 3
    // doesReceive = {}

    constructor(path, parent){
        super();
        this.classifiedStyles = {};
        this.scope = path.get("body").scope;
        this.context = parent.context;
        this.parent = parent;
    }

    didEnterOwnScope(body){
        this.hash = createHash("md5")
            .update(body.getSource())
            .digest('hex')
            .substring(0, 6);
        super.didEnterOwnScope(...arguments)
    }

    didExitOwnScope(body){
        super.didExitOwnScope(body);
        this.output = this.build()
    }

    transform(){
        return this.output || this.build()
    }

    mayReceiveAttributes(style, props){
        ({ style = style, props = props } = this.doesReceiveDynamic || false);
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

        if(Opts.reactEnv == "native"){
            let output = this.seperateItems(inline, dynamic);

            if(output.length == 1){
                output = output[0]
                if(output.type == "SpreadElement") 
                    return output.argument;
                else
                    return output
            }
            else return t.arrayExpression(output)

        } else{
            if(dynamic) inline.push(t.spreadProperty(dynamic))

            if(inline.length == 1 && inline[0].type == "SpreadProperty")
                return inline[0].argument

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

    get typeInformation(){ 

        const css = Opts.reactEnv != "native" ? [] : false;
        let type;

        const inline = {
            css,
            props: [], 
            style: []
        }

        for(const { name, head } of this.class){
            if(head){
                if(/^[A-Z]/.test(name))
                    type = t.identifier(name)
                    
                else if(this.prefix == "html" || html_tags_obvious.has(name))
                    type = t.stringLiteral(name);
            }
 
            if(!this.context) debugger
            const modify = this.context[`$${name}`];

            if(modify){
                if(typeof modify.invoke != "function") debugger
                modify.invoke(this, [], inline)
            }

            else if(css && !head)
                css.push(name);
        }
        
        if(!inline.type)
            inline.type = type || ELEMENT_TYPE_DEFAULT

        return inline;
    }

    includeComputedStyle(inline){
        if(Opts.reactEnv == "next"){
            // const name = "inline." this.class.reverse().map(x => x.name).join("-").replace("div.", "");
            const classname = this.classname = 
            this.class[this.class.length - 1].name + "-" + createHash("md5")
                    .update(this.hash)
                    .digest('hex')
                    .substring(0, 6);

            this.context.program.computedStyleMayInclude(this);
            this.context.entry.computedStyleMayInclude(this);
            inline.css.push(classname)
        }
        else 
            inline.style.push(...this.style_static.map(x => x.asProperty));
    }

    build(){

        const own_declarations = [];
        let accumulated_style, computed_props;

        const { 
            scope, 
            doesReceiveDynamic = false,

            typeInformation: inline,
            
            props: declared_props,
            style: declared_style

        } = this;

        let { 
            type: computed_type,
            props: initial_props,
            style: initial_style
        } = inline;

        if(this.style_static.length)
            this.includeComputedStyle(inline);

        let computed_style;
        
        if(this.attrs.length)
            for(const attr of this.attrs)
                inline[attr.kind || "props"].push(
                    attr.asProperty
                )

        if(this.disordered || this.stats.length || doesReceiveDynamic){

            if(computed_type.type == "Identifier"){
                const existing = scope.getBinding(computed_type.name);
                if(existing && 0 > ["const", "module"].indexOf(
                   existing.kind
                )){
                    const _actualType = computed_type;
                    computed_type = scope.generateUidIdentifier("t");
                    own_declarations.push(
                        t.variableDeclarator(computed_type, _actualType)
                    )
                }
            }

            const acc = this.context._accumulate = {};

            if(declared_style.length || doesReceiveDynamic.style){
                accumulated_style
                    = acc.style 
                    = scope.generateUidIdentifier("s");
                own_declarations.push(
                    t.variableDeclarator(accumulated_style, t.objectExpression([]))
                )
            }
            if(initial_style.length){
                computed_style = scope.generateUidIdentifier("ss");
                own_declarations.push(
                    t.variableDeclarator(
                        computed_style, 
                        this.standardCombinedStyleFormatFor(initial_style, accumulated_style)
                    )
                )
            } else {
                computed_style = accumulated_style
            }

            if(declared_props.length || doesReceiveDynamic.props){
                computed_props
                    = acc.props
                    = scope.generateUidIdentifier("p");
                own_declarations.push(
                    t.variableDeclarator(computed_props, this.standardCombinedPropsFormatFor(initial_props))
                )
            } 
            else if(computed_style){
                initial_props.push(t.objectProperty(t.identifier("style"), computed_style))
            }

        } else {

            if(declared_props.length)
                initial_props.push(...declared_props.map(x => x.asProperty))

            initial_style.push(...declared_style.map(x => x.asProperty));

            if(initial_style.length){
                initial_props.push(t.objectProperty(
                    t.identifier("style"), 
                    this.standardCombinedStyleFormatFor(initial_style)
                ))
            }

        }

        if(inline.css && inline.css.length) initial_props.push(
            t.objectProperty(
                t.identifier("className"),
                t.stringLiteral(inline.css.reverse().join(" "))
            )
        );

        const _quoteTarget = { props: computed_props, style: accumulated_style };

        const { output: computed_children, body: compute_children } = this.collateChildren( 
            (x) => {
                const target = _quoteTarget[x.inlineType];
                if(target) return x.asAssignedTo(target);
            }
        );

        const compute_instructions = [];

        if(own_declarations.length) compute_instructions.push(
            t.variableDeclaration("const", own_declarations)
        )

        compute_instructions.push(...compute_children)

        if(t.isIdentifier(computed_props) && computed_style)
            compute_instructions.push(
                t.expressionStatement(
                    t.assignmentExpression("=",
                        t.memberExpression(computed_props, t.identifier("style")), computed_style
                    )
                )
            )

        const product = transform.createElement( 
            computed_type, this.standardCombinedPropsFormatFor(initial_props, computed_props), ...computed_children
        )

        if(compute_instructions.length) {
            const reference = this.scope.generateUidIdentifier("e");

            const factory = [
                transform.declare("let", reference),
                t.blockStatement([
                    ...compute_instructions,
                    t.expressionStatement(
                        t.assignmentExpression("=", reference, product)
                    )
                ])
            ]
            return { product: reference, factory }
        }
        else return { product }
    }

    
}

