const t = require("babel-types")
const { Component } = require("./component")
const { ES6FragmentTransform } = require("./transform")
 
export class ComponentExpression extends Component {

    constructor(path, state){
        super({
            use: {
                _createElement: state.expressive_init.createElement
            }
        })
        path.node.meta = this;
        this.body = path;
    }

    mayIncludeAccumulatingChildren(){
        this.shouldRenderDynamic = true;
    }

    didEnterOwnScope(path){
        super.didEnterOwnScope(path)
    }

    didExitOwnScope(path){
        path.replaceWith(
            this.shouldRenderDynamic
                ? new ComponentExpressionTransform(this).output
                : this.innerAST()
        )
    }

    DebuggerStatement(path){
        throw path.buildCodeFrameError("Cannot place a debugger statement in simple do-block. This doesn't have it's own scope!")
    }

    VariableDeclarator(path){
        throw path.buildCodeFrameError("Cannot declare variables in simple do-block. This doesn't have it's own scope!")
    }
}

class ComponentExpressionTransform extends ES6FragmentTransform {
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

        const stuff = [
            initAccumulator,
            ...this.stats,
            returnAccumulator
        ];

        debugger

        return t.callExpression(
            t.arrowFunctionExpression([], t.blockStatement(stuff)), [])
    }
}