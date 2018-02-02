import { Component } from "./component";

const t = require("babel-types")
const { ComponentScopedFragment } = require("./component")
const { ES6FragmentTransform } = require("./transform")

const THIS_PROPS = 
t.memberExpression(
    t.thisExpression(),
    t.identifier("props")
)

export function DoMethodsAsRender(paths, state){
    let found = 0;
    for(let path of paths){

        if(++found > 1) throw path.buildCodeFrameError("multiple do methods not (yet) supported!")

        const [argument_props, argument_state] = path.get("params");
        const { body: functionBody } = path.node;

        if(argument_props){

            if(argument_props.isAssignmentPattern)
                argument_props.buildCodeFrameError("Props Argument will always resolve to `this.props`")

            path.scope.push({
                kind: "var",
                id: argument_props.node,
                init: THIS_PROPS
            })
        }

        const element = new ComponentMethod(
            path.get("body"),
            state
        )

        const doExpression = t.doExpression(functionBody);
              doExpression.meta = element;

        const output = t.classMethod(
            "method", 
            t.identifier("render"), 
            [ /*no parameters*/ ],
            t.blockStatement([
                t.returnStatement(doExpression)
            ])
        )

        path.replaceWith(output)
    }
}

export class ComponentMethod extends ComponentScopedFragment {

    constructor(body, state){

        const init = state.expressive_init;
        super({
            use: {
                _createElement: init.createElement,
                _createApplied: init.createApplied,
                _Fragment     : init.Fragment
            }
        })

        this.body = body;
    }

    mayIncludeAccumulatingChildren(){
        this.shouldRenderDynamic = true;
    }

    render(){
        if(this.shouldRenderDynamic)
            return new ComponentMethodTransform(this).output;
        else {
            let { stats, output } = this.classifyChildren();
            return [
                ...stats,
                output.expressiveEnclosure
                    ? output.callee.body
                    : t.returnStatement(output)
                
            ]
        }
    }

    didExitOwnScope(path){
        path.parentPath.replaceWithMultiple(
            this.render()
        )
    }
}

class ComponentMethodTransform extends ES6FragmentTransform {
    constructor(target){
        super(target)

        const {
            body: { scope },
            use
        } = target;

        const args = this.ownArgs = scope.generateUidIdentifier("output");

        use._accumulate = { args }
        use.scope = scope;

        this.data = Array.from(target.children)
    
        this.applyAll();
    }

    get output(){

        const { ownArgs } = this;

        const initAccumulator = t.variableDeclaration( "const", [
            t.variableDeclarator(ownArgs, t.arrayExpression([]))
        ])

        const returnAccumulator = t.returnStatement(ownArgs)

        return [
            initAccumulator,
            ...this.stats,
            returnAccumulator
        ]
    }
}