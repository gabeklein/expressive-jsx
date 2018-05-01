import { ComponentInline } from "./inline";

const t = require("babel-types")
const { ComponentGroup } = require("./component")
const { Opts, Shared, transform } = require("./shared")
const { createHash } = require('crypto');
import * as ModifierEnv from "./attributes";

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
            if(constructor)
                repairConstructor(constructor);
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

function repairConstructor(item){

    const body = item.node.body.body;
    let superAt, thisFirstUsedAt, thisFirstUsedTimes = 1;

    for(let item, i = 0; item = body[i]; i++){
        if(item.type != "ExpressionStatement") continue;
            item = item.expression
        if(item.type != "CallExpression") continue;
            item = item.callee
        if(item.type != "Super") continue;
        superAt = i;
        break;
    }

    for(
        let item, i = 0, stopAt = superAt || body.length; 
        i < stopAt;
        i++
    ){
        let item = body[i];
        if(item.type != "ExpressionStatement") continue;
            item = item.expression
        if(item.type != "AssignmentExpression") continue;
            item = item.left
        if(item.type != "MemberExpression") continue;
            item = item.object
        if(item.type != "ThisExpression") continue;
        if(!thisFirstUsedAt)
            thisFirstUsedAt = i;
        else
            thisFirstUsedTimes++
    }

    if(thisFirstUsedAt < superAt){
        const format = Array.from(body);
        const probablyClassParams = format.splice(thisFirstUsedAt, thisFirstUsedTimes);

        format.splice(superAt + 1, 0, ...probablyClassParams); 

        item.get("body").replaceWith(
            t.blockStatement(format)
        )
    }
    else if(!superAt && thisFirstUsedAt !== undefined){
        const format = Array.from(body);

        format.splice(thisFirstUsedAt, 0,
            t.expressionStatement(
                t.callExpression(
                    t.identifier("super"),
                    [t.spreadElement(
                        t.identifier("arguments")
                    )]
                )
            )
        ); 

        item.get("body").replaceWith(
            t.blockStatement(format)
        )
    }
}

export class ComponentEntry extends ComponentInline {

    init(path){
        this.context.styleRoot = this;
        this.context.scope 
            = this.scope 
            = path.get("body").scope;
    }
    
    outputBodyDynamic(){
        let body, output;
        const { style, props } = this;

        if(style.length || this.style_static.length || props.length)
            ({ 
                product: output, 
                factory: body = [] 
            } = this.build());
        else {
            ({ body, output } = this.collateChildren());
            output = output.length > 1
                ? transform.createFragment(output)
                : output[0] || t.booleanLiteral(false)
        }

        return body.concat(
            t.returnStatement(
                output
            )
        )
    }


}

class ComponentMethod extends ComponentEntry {

    constructor(name, path, subComponentNames) {
        super(path.get("body"));
        this.attendantComponentNames = subComponentNames;
        this.methodNamed = name;
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
            if(name == "render"){
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

        path.parentPath.replaceWithMultiple(this.outputBodyDynamic())
        super.didExitOwnScope(path)
    }
}

class ComponentStyleMethod {
    constructor(path) {
        this.insertDoIntermediate(path);
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
        const src = path.get("body.body")
        for(const item of src)
            if(item.type in this) 
                this[item.type](item);
            else throw item.buildCodeFrameError(`Unhandled node ${item.type}`)
    }

    didExitOwnScope(path){
        path.getAncestry().find(x => x.type == "ClassMethod").remove();
    }

    LabeledStatement(path){
        const name = path.node.label.name;
        const body = path.get("body");

        if(body.type != "BlockStatement")
            throw path.buildCodeFrameError("Only modifier declarations are allowed here")

        const recipient = { 
            context: Shared.stack,
            add(mod){
                this.context.current.stats.push(mod)
            }
        };
        const modifier = recipient.context.get(name)
        
        if(modifier) modifier(body, recipient);
        else {
            const mod = new ModifierEnv[Opts.reactEnv](name, body);
            mod.declare(recipient);
        }
    }
}


export class ComponentFunctionExpression extends ComponentEntry {

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

        if(this.style_static)
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
 
export class ComponentInlineExpression extends ComponentFunctionExpression {

    didExitOwnScope(path){
        const { body, output: product }
            = this.collateChildren();
            
        path.replaceWith(
            !body.length
                ? product
                : transform.IIFE(this.outputBodyDynamic())
        )
        this.context.pop();
    }
}