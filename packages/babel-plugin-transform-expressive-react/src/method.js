import { Component } from "./component";

const t = require("babel-types")
const { ComponentScoped } = require("./component")
const { ES6FragmentTransformDynamic } = require("./transform")

const CREATE_ELEMENT = 
    t.memberExpression(
        t.identifier("React"),
        t.identifier("createElement")
    );

export function DoMethodsAsRender(paths, classPath){
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
            path.get("body")
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

    constructor(body){
        super({})
        this.body = body;
    }

    mayIncludeAccumulatingChildren(){
        this.shouldRenderDynamic = true;
    }

    render(){
        const _new 
            = this.use._createElement 
            = this.body.scope.generateUidIdentifier("create");

        if(this.shouldRenderDynamic)
            return new ComponentMethodTransformDynamic(this).output;
        else return [
            t.variableDeclaration(
                "const", [
                    t.variableDeclarator(_new, CREATE_ELEMENT)
                ]
            ),
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

class ComponentMethodTransformDynamic extends ES6FragmentTransformDynamic {
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
        const _new = this.use._createElement;

        const initAccumulator = t.variableDeclaration( "const", [
            t.variableDeclarator(_new, CREATE_ELEMENT),
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