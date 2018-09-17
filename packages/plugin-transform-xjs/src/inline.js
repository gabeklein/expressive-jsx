const t = require('@babel/types')
const { createHash } = require('crypto');

const { html_tags_obvious } = require('./html-types');
const { Shared, Opts, transform } = require("./shared");
const { NonComponent, QuasiComponent, Prop } = require("./item")
const { ComponentGroup } = require("./component")
const util = require('util');

const ELEMENT_TYPE_DEFAULT = t.stringLiteral("div");
const ELEMENT_BR = transform.element("br");

export function RNTextNode(parent, path){
    const node = new ElementInline(path, parent);
    node.context = Object.create(parent.context);
    node.parentDeclaredAll = parent.context.allMod;
    // node.context.current = node;
    node.tags.push({name: "string"});
    node.tags.push({
        name: Opts.reactEnv == "native" ? Shared.stack.helpers.Text : "span", 
        head: true
    });
    NonComponent.applyTo(node, path)
    parent.add(node);
}

export function CollateInlineComponentsTo(parent, path){

    if(path.node 
    && path.node.extra
    && path.node.extra.parenthesized === true)
        return new NonComponent(path)

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

        const child = new ElementInline(path, parent);

        child.scope = path.get("body").scope;
        child.context = parent.context;
        child.parent = parent;

        InlineLayers.apply(child, path);
        InlineProps.applyTo(child, props);

        parent.add(child);
        parent = child;
    }
}

const InlineLayers = {

    apply(target, tag){

        const { default_type_text = {name: "div"} } = Opts;

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
            target.tags.push({name: tag.node.name, path: tag, head: true})

        else if(tag.isStringLiteral() || tag.isTemplateLiteral()){
            const default_type_text = 
                Opts.reactEnv == "native"
                    ? Shared.stack.helpers.Text
                    : "div";

            target.tags.push({name: default_type_text, head: true})
            target.add(new NonComponent(tag))
            tag.remove();
        }

        else throw tag.buildCodeFrameError("Expression must start with an identifier")
        
    },

    TaggedTemplateExpression(path){
        const tag = path.get("tag")
        QuasiComponent.applyTo(this, path.get("quasi"))

        // prevent ES6 transformer from shimming the template.
        path.remove()

        return tag
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

        this.tags.push({
            name: selector.node.name, 
            path: selector
        })

        return tag.get("object");
    }
}

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
                case "TemplateLiteral":
                case "ChildLiteral":
                case "ArrowFunctionExpression": 
                    target.add(new NonComponent(path))
                break;

                case "ObjectExpression": 
                    for(const property of path.get("properties"))
                        target.add(new this(property))
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

        switch(type){
            case "ObjectProperty": {
                const { key } = node;
                name = key.name || key.value;
                value = path.get("value");
                break;
            }

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

                let { 
                    operator: op, 
                    argument: { type, name: id_name }
                } = node;

                value = path.get("argument")

                switch(op){
                    case "+": 
                        if(type == "Identifier")
                            name = id_name;
                        else throw path.buildCodeFrameError(
                            `"Bad Prop! + only works when in conjuction with Identifier, got ${type}"`)
                    break;

                    case "~":
                        this.kind = "style"
                        this.isSpread = true
                    break;

                    default:
                        throw path.buildCodeFrameError(`"${op}" is not a recognized operator for props`)
                }

                break;
            }

            case "Identifier": {
                name = node.name
                value = {
                    node: t.booleanLiteral(true)
                }
                break;
            }

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
                this.kind = "props";
                this.isSpread = true;
                break;
            }

            // case "ArrowFunctionExpression": {
            //     value = path;
            //     name = "callback"
            //     break;
            // }

            default:
                throw path.buildCodeFrameError(`There is no property inferred from an ${type}.`)
        }

        this.path_value = value;
        this.type = type;
        this.name = name;
    }

    get value(){
        if(!this.path_value)
            throw new Error("Prop has no path_value set, this is an internal error")
        
        return this.path_value.node;
    }
}

export class ElementInline extends ComponentGroup {

    inlineType = "child"

    props = []
    doesReceive = {}
    
    attrs = []
    style = []
    tags = []
    classList = [];
    precedent = 0
    precedence = 3
    stylePriority = 2

    //Protocal Traversable

    didEnterOwnScope(body){
        super.didEnterOwnScope(...arguments);
        this.context.currentInline = this;
        this.includeInlineInformation();
    }

    didExitOwnScope(body, preventDefault){
        super.didExitOwnScope(body);
        if(this.style_static && !this.uniqueClassname)
            this.generateUCN();
        if(!preventDefault)
            this.output = this.build();
    }

    //Protocol Style Integration

    includeModifier(mod){
        this.context.declare(mod);
        mod.declareForComponent(this);
    }

    collateChildren(propHandler){
        if(this.styleGroups && this.styleGroups.length && Opts.reactEnv != "native"){
            this.insertRuntimeStyle()
        }
        return super.collateChildren(propHandler);
    }

    computedStyleMayInclude(from){
        const { uniqueClassname } = from;
        const styleGroups = this.styleGroups || (this.styleGroups = []);
        if(styleGroups.indexOf(from) < 0)
            styleGroups.push(from)
    }

    insertRuntimeStyle(){
        const styles = this.styleGroups.map(x => {
            return x.selector || x.uniqueClassname
        }).filter((x,i,a) => a.indexOf(x) == i).join(", ");

        const hash = createHash("md5")
            .update(styles)
            .digest('hex')
            .substring(0, 6);

        this.children.push({
            inlineType: "child",
            transform: () => ({
                product: transform.createElement(
                    Shared.stack.helpers.claimStyle, 
                    transform.object({
                        css: t.stringLiteral(styles),
                        hid: t.stringLiteral(hash)
                    })
                )
            })
        })
    }

    //Protocol Renderable Element

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
            if(style.type == "SpreadElement"){
                if(layer.length) output.push(t.objectExpression(layer))
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

        } else {
            if(dynamic) inline.push(t.SpreadElement(dynamic))

            if(inline.length == 1 && inline[0].type == "SpreadElement")
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
                Shared.stack.helpers.extends,
                output
            )
        } 
    }

    includeInlineInformation(){
        const installed_style = [];
        let type;

        const {
            context
        } = this;

        const inline = {
            installed_style,
            props: [], 
            style: []
        }
        
        let catchAll = context.current != this ? context : context.parent;
        if( catchAll = catchAll.allMod || this.parentDeclaredAll )
            catchAll.insert(this, [], inline)
            
        for(const { name, head } of this.tags){
            if(head){
                if(typeof name == "string"){
                    if(/^[A-Z]/.test(name)){
                        type = t.identifier(name)
                        if(name == Shared.styledApplicationComponentName){
                            context.styleRoot = this;
                        }
                    }
                        
                    else if(this.prefix == "html" || html_tags_obvious.has(name))
                        type = t.stringLiteral(name);
                }
                else if(name && name.type == "Identifier"){
                    type = name
                }
            }
 
            const modify = context.elementMod(name);
            
            if(modify && typeof modify.insert == "function"){
                modify.insert(this, [], inline)

                for(const sub of modify.provides){
                    context.declare(sub)
                }
            }
        }
        
        const hasOneNonElement = this.child.length == 1 && this.child[0].constructor.name == "NonComponent"

        if(!inline.type){
            const { helpers } = Shared.stack;
            inline.type = type || (
                Opts.reactEnv == "native" 
                    ? hasOneNonElement
                        ? helpers.Text
                        : helpers.View
                    : ELEMENT_TYPE_DEFAULT
            )
        }
    
        if(this.unhandledQuasi)
            this.includeUnhandledQuasi(inline.type.type != "Identifier")

        return this.typeInformation = inline;
    }

    includeUnhandledQuasi(using_br){
        const quasi = this.unhandledQuasi;
        const { quasis, expressions } = quasi.node;

        let INDENT = /^\n( *)/.exec(quasis[0].value.cooked);
        INDENT = INDENT && new RegExp("\n" + INDENT[1], "g");

        const items = [];
        let i = 0;

        for(let i=0, quasi; quasi = quasis[i]; i++){
            const then = expressions[i]; 

            if(Opts.reactEnv == "native" || using_br === false)
                for(let x of ["raw", "cooked"]){
                    let text = quasi.value[x];
                    if(INDENT) text = text.replace(INDENT, "\n");
                    if(i == 0) text = text.replace("\n", "")
                    if(i == quasis.length - 1)
                        text = text.replace(/\s+$/, "")
                    quasi.value[x] = text
                }
            else {
                let text = quasi.value.cooked;
                if(INDENT) 
                text = text.replace(INDENT, "\n");
                for(let line, lines = text.split(/(?=\n)/g), j=0; line = lines[j]; j++){
                    if(line[0] == "\n"){
                        if(lines[j+1] || then){
                            items.push(ELEMENT_BR)
                            items.push(
                                new NonComponent(
                                    t.stringLiteral(
                                        line.substring(1))))
                        }
                    }
                    else items.push(
                        new NonComponent(
                            t.stringLiteral( line )))
                }
                if(then) items.push(new NonComponent(then));
            }
        }

        if(Opts.reactEnv == "native" || using_br === false){
            this.add(
                new NonComponent(quasi)
            )
        }
        else {
            if(INDENT) items.shift();
            for(const child of items)
                this.add(child) 
        }
    }

    build(){
        const own_declarations = [];
        let accumulated_style, computed_props;

        const { 
            scope, 
            doesReceiveDynamic = false,
            props: declared_props,
            style: declared_style
        } = this;

        const inline = this.typeInformation || this.includeInlineInformation();

        let { 
            type: computed_type,
            props: initial_props,
            style: initial_style
        } = inline;

        if(this.style_static.length || this.mayReceiveExternalClasses){
            this.generateUCN()
            inline.installed_style.push(this)
        }

        if(this.style_static.length){
            this.styleID = t.identifier(this.uid.replace('-', '_'))
            this.context.declareForRuntime(this);
        }

        let computed_style;
        
        if(this.attrs.length)
            for(const attr of this.attrs)
                inline[attr.kind || "props"].push(
                    attr.asProperty
                )

        if(inline.installed_style && inline.installed_style.length)
            if(Opts.reactEnv == "native"){
                const mS = Shared.stack.helpers.ModuleStyle;
                const imported = [];
                for(const item of inline.installed_style){
                    if(!item.styleID){
                        throw new Error("No styleID found!")
                        debugger
                    }
                    imported.push(
                        t.spreadElement(t.memberExpression(mS, item.styleID))
                    )
                }
                initial_style.splice(0, 0, ...imported)
            }
            else 
                for(const { uid } of inline.installed_style)
                    if(this.classList.indexOf(uid) < 0)
                        this.classList.push(uid);

        if(this.classList.length){
            if(Opts.reactEnv == "native"){
                //native stuff
            } else {
                let applied = [];
                for(const item of this.classList){
                    const last = applied[applied.length - 1];
                    if(typeof last == "string" && typeof item == "string") 
                        applied[applied.length - 1] += " " + item;
                    else applied.push(item)
                }

                if(applied.length == 1){
                    const cn = applied[0];
                    applied = typeof cn != "string" ?
                        cn : t.stringLiteral(cn)
                } else
                    applied = t.callExpression(
                        Shared.stack.helpers.select,
                        applied.map(x => typeof x == "string" ? t.stringLiteral(x) : x)
                        
                    )

                initial_props.push(
                    t.objectProperty(
                        t.identifier("className"), applied
                    )
                );
            }
        }
    

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

        const _quoteTarget = { props: computed_props, style: accumulated_style };

        const { 
            output: computed_children = [], 
            body: compute_children 
        } = this.collateChildren( child => {
                const target = _quoteTarget[child.inlineType];
                if(target) return child.asAssignedTo(target);
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
            computed_type, 
            this.standardCombinedPropsFormatFor(initial_props, computed_props), 
            ...computed_children
        );

        if(compute_instructions.length == 0) 
            return { product }
        else {
            const reference = this.scope.generateUidIdentifier("e");
            return { 
                product: reference, 
                factory: [
                    transform.declare("let", reference),
                    t.blockStatement([
                        ...compute_instructions,
                        t.expressionStatement(
                            t.assignmentExpression("=", reference, product)
                        )
                    ])
                ]
            }
        } 
    }
}