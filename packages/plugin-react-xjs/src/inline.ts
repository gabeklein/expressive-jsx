import {
    Path,
    Scope,
    ListElement, 
    ElementSyntax,
    BunchOf
} from "./types";

import {
    DoExpression,
    TemplateLiteral,
    Expression,
    StringLiteral,
    CallExpression,
    MemberExpression,
    ObjectProperty,
    TaggedTemplateExpression,
    ObjectExpression,
    Identifier,
    SpreadElement
} from "@babel/types";

import {
    Shared, 
    Opts, 
    transform, 
    inParenthesis,
    NonComponent,
    ExplicitStyle,
    ComponentGroup,
    ElementModifier
} from "./internal"

import { createHash } from 'crypto';
import { html_tags_obvious } from './html-types';
import * as t from "@babel/types";

const ELEMENT_TYPE_DEFAULT = t.stringLiteral("div");

type ObjectItem = ObjectProperty | SpreadElement;

export function RNTextNode(
    parent: ComponentGroup, 
    path: Path<StringLiteral | TemplateLiteral> ){

    const node = new ElementInline();
    node.context = Object.create(parent.context);
    node.parentDeclaredAll = parent.context.allMod;
    node.tags.push(
        {name: "string"}, 
        {name: Opts.reactEnv == "native" ? Shared.stack.helpers.Text : "span", 
        head: true
        }
    );
    NonComponent.applyTo(node, path)
    node.parent = parent;
    parent.add(node);
}

export function CollateInlineComponentsTo(
    parent: ComponentGroup, 
    path: Path<Expression>){

    if(inParenthesis(path))
        return new NonComponent(path)

    let props = [] as Path<Expression>[];

    if(path.isSequenceExpression())
        [path, ...props] = path.get('expressions');

    if(path.isBinaryExpression({operator: ">"})){
        const item = Object.create(path.get("right")) as Path<Expression>;
        item.type = "ChildLiteral";
        props.push(item);
        path = path.get("left") as any;
    }

    const stack = [{ props }] as {
        props: Path<Expression>[],
        path?: Path<Expression>
    }[];

    while(path.isBinaryExpression({operator: ">>"})){
        stack[0].path = path.get("right");
        path = path.get("left");
        stack.unshift({} as any);
    }
    stack[0].path = path;

    for(const iteration of stack){
        const path = iteration.path!;

        if(inParenthesis(path))
            throw path.buildCodeFrameError("Children in Parenthesis are not allowed, for direct insertion used an Array literal")

        const child = new ElementInline();

        child.scope = (path.get("body") as any).scope as Scope;
        child.context = parent.context;
        child.parent = parent;

        InlineLayers.apply(child, path);
        InlineProps.applyTo(child, iteration.props);

        parent.add(child);
        parent = child;
    }
}

abstract class InlineLayers {

    static apply(target: ElementInline, tag: Path<Expression>){

        if(tag.isBinaryExpression({operator: "-"})){
            const left = tag.get("left") as Path<Expression>;

            if(left.isIdentifier())
                target.prefix = left.node.name
            else
                left.buildCodeFrameError("Improper element prefix");
            tag = tag.get("right") as any;
        }

        while(!inParenthesis(tag) && tag.type in this)
            tag = (this as any)[tag.type].call(target, tag);

        if(tag.isIdentifier())
            target.tags.push(
                {name: tag.node.name, path: tag, head: true}
            )

        else if(tag.isStringLiteral() || tag.isTemplateLiteral()){
            target.tags.push(
                { name: "string" },
                { name: Opts.reactEnv == "native" ? Shared.stack.helpers.Text : "div", 
                head: true
                }
            )

            target.add(new NonComponent(tag))

            tag.remove();
        }

        else throw tag.buildCodeFrameError("Expression must start with an identifier")
    }

    static TaggedTemplateExpression(
        this: ElementInline, 
        path: Path<TaggedTemplateExpression> ){

        const tag = path.get("tag");

        this.unhandledQuasi = path.get("quasi");
        // QuasiComponent.applyTo(this, 
        //     path.get("quasi") as Path<TemplateLiteral>
        // )

        // prevent ES6 transformer from shimming the template.
        path.remove()

        return tag
    }

    static CallExpression(this: ElementInline, tag: Path<CallExpression>){
        const args = tag.get("arguments") as Path<Expression>[];
        InlineProps.applyTo(this, args);
        return tag.get("callee");
    }

    static MemberExpression(this: ElementInline, tag: Path<MemberExpression>){

        const selector = tag.get("property") as Path;
        if(tag.node.computed !== true && selector.isIdentifier()){
            this.tags.push({
                name: selector.node.name, 
                path: selector as any
            })
        }
        else 
            throw selector.buildCodeFrameError(
                "Due to how parser works, a semicolon is required after the element preceeding escaped children."
            )

        return tag.get("object");
    }
}

class InlineProps {
    inlineType = "attrs"
    precedence = 0
    path: Path<any>;
    kind?: "style" | "props";
    isSpread?: true;
    name?: string;
    path_value?: any;

    static applyTo(target: ElementInline, props: Path<Expression>[]){
        if(!props) return;
        for(let path of props){
            switch(path.type){
                case "DoExpression":
                    if(target.body) throw path.buildCodeFrameError("Do Expression was already declared!")
                    target.body = path;
                    target.scope = path.scope;
                    (path.node as any).meta = target;
                break;

                case "StringLiteral":
                case "TemplateLiteral":
                case "ChildLiteral":
                case "ArrowFunctionExpression": 
                    target.add(new NonComponent(path))
                break;

                case "ObjectExpression": 
                    for(const property of (path as Path<ObjectExpression>).get("properties"))
                        target.add(new this(property))
                break;

                default: 
                    target.add(new this(path))
            }
        }
    }

    constructor(path: Path<any>){
        this.path = path;
        this.computeValue();
    }

    computeValue(){
        const { path } = this;
        const { node } = path;
        let name;
        let value: any;

        if(path.isObjectProperty()){
            const { key } = path.node;
            name = key.name || key.value;
            value = path.get("value");
        } 
        
        else if(path.isTaggedTemplateExpression()){
            const {tag, quasi} = path.node;

            if(tag.type != "Identifier") 
                throw path.buildCodeFrameError("Prop must be an Identifier");

            if(quasi.expressions.length == 0)
                value = { node: t.stringLiteral(quasi.quasis[0].value.raw) }
            else
                value = path.get("quasi")//.node;

            name = tag.name
            //collapsing prevents down-line transformers from adding useless polyfill
            //replaced instead of removed because value itself must remain in-line to receive legitiment transforms
            path.replaceWith(value)

        } 
        
        else if(path.isUnaryExpression()){
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
                        `"Bad Prop! + only works in conjuction with an Identifier, got ${type}"`)
                break;

                case "~":
                    this.kind = "style"
                    this.isSpread = true
                break;

                default:
                    throw path.buildCodeFrameError(`"${op}" is not a recognized operator for props`)
            }
        }

        else if(path.isIdentifier()){
            name = node.name
            value = {
                node: t.booleanLiteral(true)
            }
        }

        else if(path.isAssignmentExpression()){
            if(node.operator != "=")
                throw (path.get("operator") as Path)
                    .buildCodeFrameError("Props may only be assigned with `=` or using tagged templates.");

            const left = path.get("left") as any; //bad definition returns <never>

            if(left.isMemberExpression())
                throw left.buildCodeFrameError("Member Expressions can't be prop names");

            if(node.left.type == "Identifier")
                name = node.left.name;

            else left.buildCodeFrameError("Prop assignment only works on an identifier to denote name")

            value = path.get("right")
        }

        else if(path.isSpreadElement()){
            value = path.get("argument")
            this.kind = "props";
            this.isSpread = true;
        }

        else throw path.buildCodeFrameError(`There is no property inferred from an ${path.type}.`)

        this.path_value = value;
        this.name = name;
    }

    //from attribute
    get asProperty(): ObjectProperty | SpreadProperty {
        const { name, value, isSpread } = this;
        if(isSpread){
            return t.spreadElement(value!)
        } else {
            if(!name)
                throw new Error("Internal Error: Prop has no name!")
            return t.objectProperty(t.identifier(name), value!)
        }
    }

    get value(){
        if(!this.path_value)
            throw new Error("Prop has no path_value set, this is an internal error")
        
        return this.path_value.node;
    }
}

interface TypeInformation {
    type?: string | Identifier
    installed_style: ElementInline[]
    props: ObjectItem[]
    style: ObjectItem[]
}

export class ElementInline extends ComponentGroup {

    inlineType = "child"
    doesReceive = {}
    attrs = [] as Attribute[];
    classList = [] as string[];
    precedent = 0
    precedence = 3
    stylePriority = 2
    inlineInformation = {} as TypeInformation;
    unhandledQuasi?: Path<TemplateLiteral>;
    prefix?: string;
    styleGroups = [] as ElementModifier[];
    parentDeclaredAll?: any;
    stats_excused?: number;
    mayReceiveExternalClasses?: true;
    doesReceiveDynamic?: {
        props?: true;
        style?: true;
    };

    body?: Path<Expression> //unused
    output?: ElementSyntax;
    uid?: string;
    styleID?: Identifier;

    //Protocal Traversable

    didEnterOwnScope(body: Path<DoExpression>){
        super.didEnterOwnScope(body);
        this.context.currentInline = this;
        this.combineInlineInformation();
    }

    didExitOwnScope(body: Path<DoExpression>, preventDefault?: boolean){
        super.didExitOwnScope(body);
        if(this.style_static && !this.uniqueClassname)
            this.generateUCN();
        if(!preventDefault)
            this.output = this.build();
    }

    //Protocol Style Integration

    includeModifier(mod: ElementModifier){
        this.context.declare(mod);
        mod.declareForComponent(this);
    }

    collateChildren(propHandler?: (item: any) => any){
        if(this.styleGroups && this.styleGroups.length && Opts.reactEnv != "native"){
            this.insertRuntimeStyle()
        }
        return super.collateChildren(propHandler);
    }

    computedStyleMayInclude(from: ElementModifier){
        const styleGroups = this.styleGroups;
        if(styleGroups.indexOf(from) < 0)
            styleGroups.push(from)
    }

    insertRuntimeStyle(){
        const styles = this.styleGroups.map(x => {
            return x.selector || x.uniqueClassname
        }).filter((x,i,a) => a.indexOf(x) == i).join("; ");

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

    transform(){
        return this.output || this.build()
    }

    mayReceiveAttributes(style?: true, props?: true){
        ({ style = style, props = props } = this.doesReceiveDynamic || {} as any);
        this.doesReceiveDynamic = { style, props };
    }

    seperateItems(
        inline: ObjectItem[], 
        dynamic: any
    ) : ArrayItem[] {

        let output = [] as Expression[];
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

    standardCombinedStyleFormatFor(
        inline: ObjectItem[], 
        dynamic?: any 
    ): Expression {

        if(Opts.reactEnv == "native"){
            let output = this.seperateItems(inline, dynamic);

            if(output.length == 1){
                const [ first ] = output;
                if(first.type == "SpreadElement") 
                    return first.argument;
                else
                    return first
            }
            else return t.arrayExpression(output)

        } else {
            if(dynamic) inline.push(t.spreadElement(dynamic))

            if(inline.length == 1 && inline[0].type == "SpreadElement")
                return (inline[0] as SpreadElement).argument

            return t.objectExpression(inline);
        }
    }

    standardCombinedPropsFormatFor(
        inline: any, 
        dynamic?: any 
    ): Expression {

        const { classList } = inline;
        if(classList){
            inline = inline.filter((prop: ObjectProperty) => {
                if(prop.key.name == "className" && prop.value !== classList){
                    const { value } = prop;
                    if(classList.type == "StringLiteral" && value.type == "StringLiteral")
                        classList.value += " " + value.value;
                    else {
                        Object.assign(classList, 
                            t.callExpression(
                                Shared.stack.helpers.select,
                                [Object.assign({}, classList), value]
                            )
                        )
                    }
                    return false;
                }
                return true;
            })
        }

        let output = this.seperateItems(inline, dynamic);
        if(output.length == 1){
            return output[0] as Expression
        } 
        else if(!output[0])
            return t.objectExpression([])
        else {
            return t.callExpression(
                Shared.stack.helpers.extends,
                output
            )
        } 
    }

    combineInlineInformation(){
        const {
            context
        } = this;

        const inline: TypeInformation = {
            installed_style: [],
            props: [], 
            style: [],
            type: ""
        }
        
        let type;
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
                // else if(name && name.type == "Identifier"){
                //     type = name
                // }
            }
 
            const modify = context.elementMod(name);
            
            if(modify && typeof modify.insert == "function"){
                modify.insert(this, [], inline)

                for(const sub of modify.provides){
                    context.declare(sub)
                }
            }
        }
        
        const hasOneNonElement = this.child.length == 1 && this.child[0] instanceof NonComponent

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
            this.includeUnhandledQuasi(this.unhandledQuasi, (inline.type as any).type != "Identifier")
            
        return this.inlineInformation = inline;
    }

    includeUnhandledQuasi(
        quasi: Path<TemplateLiteral>, 
        using_br: boolean ){

        const { quasis, expressions } = quasi.node;
        const initial_indent = /^\n( *)/.exec(quasis[0].value.cooked);
        const INDENT = initial_indent && new RegExp("\n" + initial_indent[1], "g");
        const items = [];

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
                const ELEMENT_BR = transform.createElement("br");
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
                this.add(child as any) 
        }
    }

    build(): ElementSyntax {
        let accumulated_style: Expression;
        let computed_props: Expression;
        let computed_style;

        const own_declarations = [];
        const scope = this.scope!;
        
        const { 
            doesReceiveDynamic = false,
            props: declared_props,
            style: declared_style
        } = this;

        let { 
            installed_style,
            type: computed_type,
            props: initial_props = [] as ObjectItem[],
            style: initial_style = [] as ObjectItem[]
        } = this.inlineInformation.type 
            ? this.inlineInformation 
            : this.combineInlineInformation();

        if(!computed_type) debugger;

        if(this.style_static.length || this.mayReceiveExternalClasses){
            this.generateUCN()
            installed_style.push(this)
        }

        if(this.style_static.length){
            this.styleID = t.identifier(this.uid!.replace('-', '_'))
            this.context.declareForRuntime(this);
        }

        if(this.attrs.length)
            for(const attr of this.attrs)
                if(attr.kind == "style")
                    initial_style.push(attr.asProperty)
                else
                    initial_props.push(attr.asProperty)

        if(installed_style && installed_style.length){
            if(Opts.reactEnv == "native"){
                const mS = Shared.stack.helpers.ModuleStyle;
                const imported = [];
                for(const item of installed_style){
                    if(!item.styleID){
                        throw new Error("No styleID found!")
                    }
                    imported.push(
                        t.spreadElement(t.memberExpression(mS, item.styleID))
                    )
                }
                initial_style.splice(0, 0, ...imported)
            }
            else 
                for(const modifier of installed_style){
                    const uid = modifier.uid!;
                    if(this.classList.indexOf(uid) < 0)
                        this.classList.push(uid);
                }
        }

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

                let thingy: Expression;

                if(applied.length == 1){
                    const cn = applied[0];
                    thingy = typeof cn != "string" ?
                        cn : t.stringLiteral(cn)
                } 
                else
                    thingy = t.callExpression(
                            Shared.stack.helpers.select,
                            applied.map(x => typeof x == "string" ? t.stringLiteral(x) : x)
                        )

                const classNameProp = t.objectProperty(
                    t.identifier("className"), thingy
                );

                initial_props.push(classNameProp);
                (initial_props as any).classList = thingy;
            }
        }
    

        if(this.disordered || (this.stats.length > this.stats_excused! || 0) || doesReceiveDynamic){

            if(typeof computed_type !== "string"
            && computed_type!.type == "Identifier"){
                const existing = scope.getBinding(computed_type!.name);
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

            const acc = this.context._accumulate = {} as { 
                style: Identifier,
                props: Identifier
            };

            if(declared_style.length || doesReceiveDynamic && doesReceiveDynamic.style){
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
                        this.standardCombinedStyleFormatFor(initial_style, accumulated_style!)
                    )
                )
            } else {
                computed_style = accumulated_style!
            }

            if(declared_props.length || doesReceiveDynamic && doesReceiveDynamic.props){
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

        const _quoteTarget = { 
            props: computed_props!, 
            style: accumulated_style!
        };

        const { 
            output: computed_children = [], 
            body: compute_children 
        } = this.collateChildren( (child: Attribute | ExplicitStyle) => {
                const target = (_quoteTarget as any)[child.inlineType];
                if(target) return child.asAssignedTo(target);
            }
        );

        const compute_instructions = [];

        if(own_declarations.length) compute_instructions.push(...
            Opts.compact_vars 
                ? [t.variableDeclaration("const", own_declarations)]
                : own_declarations.map(dec => t.variableDeclaration("const", [dec]))
        )

        compute_instructions.push(...compute_children)

        if(t.isIdentifier(computed_props!) && computed_style)
            compute_instructions.push(
                t.expressionStatement(
                    t.assignmentExpression("=",
                        t.memberExpression(computed_props!, t.identifier("style")), computed_style
                    )
                )
            )

        const product = transform.createElement(
            computed_type!, 
            this.standardCombinedPropsFormatFor(initial_props!, computed_props!) as ObjectExpression, 
            ...computed_children
        );

        if(compute_instructions.length == 0 || compute_instructions.length <= this.stats_excused!)
            return { 
                product, 
                factory: this.stats_excused 
                    ? compute_instructions 
                    : undefined 
            }
        else {
            const reference = scope.generateUidIdentifier("e");
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