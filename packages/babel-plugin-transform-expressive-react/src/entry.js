
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
    constructor(parent){
        super(parent);
    }

    didEnterOwnScope(path){
        super.didEnterOwnScope(path)
        this.use.scope 
            = this.scope 
            = path.get("body").scope;
    }
}

class ComponentMethod extends ComponentEntry {

    constructor(path){
        super(path.get("body"))
    }

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
        this.render()
        // path.parentPath.replaceWithMultiple()
    }
}

export class ComponentFunctionExpression extends ComponentEntry {

    insertDoIntermediate(path){
        path.node.meta = this;
    }

    outputBodyDynamic(){
        const { body, exported }
            = this.accumulatedChildren();

        const returned = 
            exported.length > 1
                ? transform.createFragment(exported)
                : exported[0] || t.booleanLiteral(false)

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

    outputSelfContained(){
        let body;
        const { stats } = this;

        if(this.shouldOutputDynamic)
            body = this.outputBodyDynamic()
        else {
            const { stats, inner } = this.transformDataInline();
            body = [
                ...stats,
                t.returnStatement( 
                    this.outputInline(inner)
                )
            ]
        }
        return transform.IIFE(body)
    }

    outputBodyDynamic(){

        const { body, refs }
            = this.accumulatedChildren();

        const returned = 
            refs.length > 1
                ? transform.createFragment(refs)
                : refs[0] || t.booleanLiteral(false)

        return [
            ...body, 
            t.returnStatement(returned)
        ]
    }

    didExitOwnScope(path){
        this.shouldOutputDynamic = true;
        path.replaceWith(
           (this.stats.length || this.shouldOutputDynamic)
                ? this.outputSelfContained()
                : this.outputInline()
        )
    }

}