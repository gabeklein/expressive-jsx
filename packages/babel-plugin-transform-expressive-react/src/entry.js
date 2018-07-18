const t = require("babel-types")
const { createHash } = require('crypto');

const { ComponentGroup } = require("./component")
const { Opts, Shared, transform } = require("./shared")
const { GeneralModifier } = require("./modifier");
const { ElementInline } = require("./inline");

const TARGET_FOR = {
    VariableDeclarator: "id",
    AssignmentExpression: "left",
    AssignmentPattern: "left",
    ObjectProperty: "key"
}

export function RenderFromDoMethods(renders, subs){
    let found = 0;
    const subComponentNames = subs.map(
        x => x.node.key.name
    );

    for(let path of subs){
        const { name } = path.node.key;
        new ComponentMethod(name, path, subComponentNames);
    }

    for(let path of renders){
        if(++found > 1) throw path.buildCodeFrameError("multiple do methods not supported")
        new ComponentMethod("render", path, subComponentNames);
    }
}

export class DoComponent {
    static enter(path, state){

        let { node } = path,
            { meta } = node;

        if(node.expressive_visited) return

        if(!meta){

            let immediateParent = path.parentPath;
            let Handler;

            if(immediateParent.isArrowFunctionExpression()){
                Handler = ComponentFunctionExpression;
                immediateParent = immediateParent.parentPath;
            } 
            else if(!immediateParent.isSequenceExpression()){
                Handler = ComponentInlineExpression;
            }
            else throw immediateParent.getAncestry()
                .find(x => x.type == "ArrowFunctionExpression")
                .get("body")
                .buildCodeFrameError("Component Syntax `..., do {}` found outside expressive context! Did you forget to arrow-return a do expression?")

            let { type, node: parent } = immediateParent;
            let name;

            if(type == "ExportDefaultDeclaration")
                name = "default"
            else if(type == "ReturnStatement")
                name = "returned"
            else if(type == "SequenceExpression")
                name = "callback"
            else {
                const ident = parent[TARGET_FOR[type]];
                name = ident ? ident.name : "do" 
            }

            meta = node.meta = new Handler(path, name)
        }

        meta.didEnterOwnScope(path)

        state.expressive_used = true;
    }

    static exit(path, state){
        const { node } = path;

        if(node.expressive_visited) return
        else node.expressive_visited = true;

        if(!node.meta) debugger

        node.meta.didExitOwnScope(path)
    }
}

export class ComponentClass {
    static enter(path, state){

        const doFunctions = [], 
              subComponents = [];
        let componentStyles;
        let constructor;

        for(let item of path.get("body.body")){

            if(item.isClassMethod({kind: "constructor"}))
                constructor = item

            else if(item.isClassMethod({kind: "method"})){
                if(item.get("key").isIdentifier()){
                    const { name } = item.node.key;
                    
                    if(name == "do" || path.node.id && name == path.node.id.name)
                        doFunctions.push(item)

                    else if(name == "Style")
                        new ComponentStyleMethod(item)

                    else if(/^[A-Z]/.test(name))
                        subComponents.push(item)
                }
            }
        }

        if(doFunctions.length) {
            const modifierInsertions = [];
            const current = {
                classContextNamed: path.node.id && path.node.id.name || "Anonymous",
                stats: modifierInsertions
            }

            Shared.stack.push(current);
            Shared.stack.currentlyParsingClass = path;
            Shared.stack.modifierInsertions = modifierInsertions
            Shared.stack.styleRoot = null;

            RenderFromDoMethods(doFunctions, subComponents);
            state.expressive_used = true;
        }
    }

    static exit(path, state){
        if(Shared.stack.currentlyParsingClass == path)
            Shared.stack.pop();
    }
}

export class ComponentEntry extends ElementInline {

    init(path){
        this.context.styleRoot = this;
        this.context.scope 
            = this.scope 
            = path.get("body").scope;
    }
    
    outputBodyDynamic(){
        let body, output;
        const { style, props } = this;

        if(style.length || this.mayReceiveExternalClasses || this.style_static.length || props.length)
            ({ 
                product: output, 
                factory: body = [] 
            } = this.build());
        else {
            ({ body, output } = this.collateChildren());
            output = this.bundle(output)
        }

        return body.concat(
            t.returnStatement(
                output
            )
        )
    }

    bundle(output){
        return output.length > 1
            ? transform.createFragment(output)
            : output[0] || t.booleanLiteral(false)
    }
}

class ComponentMethod extends ComponentEntry {

    constructor(name, path, subComponentNames) {
        super(path.get("body"));
        this.attendantComponentNames = subComponentNames;
        this.methodNamed = name;
        if(name == "render"){
            this.isRender = true; 
            name = Shared.stack.current.classContextNamed;
        }
        this.tags.push({ name });
        this.insertDoIntermediate(path)
    }

    insertDoIntermediate(path){
        const doExpression = t.doExpression(path.node.body);
              doExpression.meta = this;

        const [argument_props, argument_state] = path.get("params");
        const body = path.get("body");
        const src = body.getSource();
        const name = this.methodNamed;
        
        const bindRelatives = this.attendantComponentNames.reduce(
            (acc, name) => {
                if(new RegExp(`[^a-zA-Z_]${name}[^a-zA-Z_]`).test(src)){
                    name = t.identifier(name);
                    acc.push(
                        t.objectProperty(name, name, false, true)
                    )
                }
                return acc;
            }, []
        )

        if(bindRelatives.length)
            if(this.isRender){
                body.scope.push({
                    kind: "const",
                    id: t.objectPattern(bindRelatives),
                    init: t.thisExpression()
                })
            } 
            else throw new Error("fix WIP: no this context to make sibling elements visible")


        let params = [];

        if(argument_props)
            if(name == "render"){
                if(argument_props.isAssignmentPattern())
                    argument_props.buildCodeFrameError("Props Argument will always resolve to `this.props`")

                body.scope.push({
                    kind: "var",
                    id: argument_props.node,
                    init: t.memberExpression( t.thisExpression(), t.identifier("props") )
                })
            } 
            else params = [argument_props.node]

        path.replaceWith(
            t.classMethod(
                "method", 
                t.identifier(name), 
                params,
                t.blockStatement([
                    t.returnStatement(doExpression)
                ])
            )
        )
    }

    didEnterOwnScope(path){
        super.didEnterOwnScope(path)
    }

    didExitOwnScope(path){

        const insertStats = this.context.modifierInsertions;
        this.children.splice(0, 0, ...insertStats);
        for(const item of insertStats)
            this.context.styleRoot.computedStyleMayInclude(item);

        super.didExitOwnScope(path, true)
        path.parentPath.replaceWithMultiple(this.outputBodyDynamic())
    }
}

class ComponentStyleMethod {
    constructor(path) {
        this.insertDoIntermediate(path);
    }

    includeModifier(mod){
        this.context.declare(mod);
        mod.declareForComponent(this);
    }

    add(mod){
        this.context.current.stats.push(mod)
    }

    insertDoIntermediate(path){
        const doExpression = t.doExpression(path.node.body);
            doExpression.meta = this;

        path.replaceWith(
            t.classMethod(
                "method", 
                t.identifier("Style"), 
                [ /*no params*/ ],
                t.blockStatement([
                    t.expressionStatement(doExpression)
                ])
            )
        )
    }

    didEnterOwnScope(path){
        this.context = Shared.stack;

        const src = path.get("body.body")
        for(const item of src)
            if(item.type in this) 
                this[item.type](item);
            else throw item.buildCodeFrameError(`Unhandled node ${item.type}`)
    }

    didExitOwnScope(path){
        path.getAncestry().find(x => 
            x.type == "ClassMethod" ||
            x.type == "ObjectExpression" &&
            x.node.properties.length == 2
        ).remove();
    }

    LabeledStatement(path){
        if(!path.get("body").isBlockStatement())
            throw path.buildCodeFrameError("Only modifier declarations are allowed here")

        GeneralModifier.applyTo(this, path);
    }
}

class ComponentFunctionExpression extends ComponentEntry {

    constructor(path, name) {
        super(path);
        this.tags.push({name})
    }

    insertDoIntermediate(path){
        path.node.meta = this;
    }

    didExitOwnScope(path){
        const parentFn = path.parentPath;
        const {params, generator, async} = parentFn.node;

        if(this.style_static || this.mayReceiveExternalClasses)
            this.generateClassName();

        parentFn.replaceWith(
            t.functionExpression(
                null, 
                params, 
                t.blockStatement(this.outputBodyDynamic()), 
                generator, 
                async
            )
        )
        this.context.pop();
    }
}
 
class ComponentInlineExpression extends ComponentFunctionExpression {

    didExitOwnScope(path){
        const { body, output: product }
            = this.collateChildren();
            
        path.replaceWithMultiple(
            !body.length
                ? this.bundle(product)
                : [transform.IIFE(this.outputBodyDynamic())]
        )

        this.context.pop();
    }
}