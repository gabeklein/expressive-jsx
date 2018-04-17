import { ComponentInline } from "./inline";

const t = require("babel-types")
const { ComponentGroup } = require("./component")
const { Shared, transform } = require("./shared")
const { createHash } = require('crypto');

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
        if(++found > 1) throw path.buildCodeFrameError("multiple do methods not (yet) supported!")
        new ComponentMethod("render", path, subComponentNames);
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
        // if(this.styleGroups.length || this.style_static.length)
        //     this.insertRuntimeStyleContextClaim()
        
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

    didExitOwnScope(path){
        path.parentPath.replaceWithMultiple(this.outputBodyDynamic())
        super.didExitOwnScope(path)
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