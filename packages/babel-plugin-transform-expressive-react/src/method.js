import { Component } from "./component";

const t = require("babel-types")
const { ComponentScoped } = require("./component")
const { ES6FragmentTransform } = require("./transform")

const THIS_PROPS = 
t.memberExpression(
    t.thisExpression(),
    t.identifier("props")
)

const CREATE_ELEMENT = 
    t.memberExpression(
        t.identifier("React"),
        t.identifier("createElement")
    );

export function DoMethodsAsRender(paths, state){
    let found = 0;
    for(let path of paths){

        if(++found > 1) throw path.buildCodeFrameError("multiple do methods not (yet) supported!")

        const { params, body: functionBody } = path.node;
        const [argument_props, argument_state] = params;

        if(argument_props){
            const bindings =
                t.isAssignmentPattern(argument_props)
                ? [ argument_props.left, argument_props.right ]
                : [ argument_props ]

            const var_props = 
                t.variableDeclaration("var",
                    bindings
                    .map( binding => t.variableDeclarator(binding, THIS_PROPS) )
                    .reverse()
                )

            functionBody.body.push(var_props)
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

export class ComponentMethod extends ComponentScoped {

    constructor(body, state){
        super({
            use: {
                _createElement: state.expressive_init.createElement
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
        else return [
            ...this.statements,
            t.returnStatement(
                this.innerAST()
            )
        ]
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