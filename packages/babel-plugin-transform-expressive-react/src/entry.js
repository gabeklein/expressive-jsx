
const t = require("babel-types")
const { ComponentFragment } = require("./component")
const { Shared, transform } = require("./shared")

export function RenderFromDoMethods(paths, state, opts){
    let found = 0;
    for(let path of paths){
        if(++found > 1) throw path.buildCodeFrameError("multiple do methods not (yet) supported!")
        new ComponentMethod(path, state);
    }
}

class ComponentEntry extends ComponentFragment {

    constructor(path){
        super(path)
        this.scope = path.scope;
        this.context.root = this;
    }

    mayReceiveAttributes(style, props){
        const complainAbout = props || style;
        const description = style ? "Style" : "Prop";
        throw complainAbout.path.buildCodeFrameError(`${description} has nothing to apply to in this context!`)
    }

    didEnterOwnScope(path){
        super.didEnterOwnScope(path)
        this.context.scope 
            = this.scope 
            = path.get("body").scope;
    }
}

class ComponentMethod extends ComponentEntry {

    insertDoIntermediate(path){
        const doExpression = t.doExpression(path.node.body);
              doExpression.meta = this;
        path.replaceWith(
            this.generateMethodRender(path, doExpression)
        )
    }

    generateMethodRender(path, doExpression){
        const [argument_props, argument_state] = path.get("params");
        const body = path.get("body");

        if(argument_props){
            if(argument_props.isAssignmentPattern())
                argument_props.buildCodeFrameError("Props Argument will always resolve to `this.props`")

            body.scope.push({
                kind: "var",
                id: argument_props.node,
                init: t.memberExpression( t.thisExpression(), t.identifier("props") )
            })
        }

        return t.classMethod(
            "method", 
            t.identifier("render"), 
            [ /*no parameters*/ ],
            t.blockStatement([
                t.returnStatement(doExpression)
            ])
        )
    }

    didExitOwnScope(path){
        const { body, output }
            = this.collateChildren();

        const returned = 
            output.length > 1
                ? transform.createFragment(output)
                : output[0] || t.booleanLiteral(false)

        path.parentPath.replaceWithMultiple([
            ...body, 
            t.returnStatement(returned)
        ])
    }
}

export class ComponentFunctionExpression extends ComponentEntry {

    insertDoIntermediate(path){
        path.node.meta = this;
    }

    outputBodyDynamic(){
        const { body, output }
            = this.collateChildren();

        const returned = 
            output.length > 1
                ? transform.createFragment(output)
                : output[0] || t.booleanLiteral(false)

        return [
            ...body, 
            t.returnStatement(returned)
        ]
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
    }
}
 
export class ComponentInlineExpression extends ComponentFunctionExpression {

    didExitOwnScope(path){
        const { body, output: product }
            = this.collateChildren();

        const output = product.length > 1
            ? transform.createFragment(product)
            : product[0] || t.booleanLiteral(false)

        path.replaceWith(
            !body.length
                ? output
                : transform.IIFE([
                    ...body, 
                    t.returnStatement(output)
                ])
        )
    }
}