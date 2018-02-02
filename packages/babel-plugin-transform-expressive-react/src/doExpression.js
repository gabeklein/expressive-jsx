const t = require("babel-types")
const { ComponentScopedFragment } = require("./component")
const { ES6FragmentTransform } = require("./transform")

export function ComputeNewComponentExpression(path, state) {
    return path.parentPath.type == "ArrowFunctionExpression"
        ? new ComponentFunctionExpression(path, state)
        : new ComponentExpression(path, state)
}

class ComponentGenericExpression extends ComponentScopedFragment {
    constructor(path, state){
        const init = state.expressive_init;
        super({
            use: {
                _createElement: init.createElement,
                _createApplied: init.createApplied,
                _Fragment     : init.Fragment
            }
        })
        path.node.meta = this;
        this.body = path;
    }
}
 
class ComponentExpression extends ComponentGenericExpression {

    didExitOwnScope(path){
        
        
        path.replaceWith(
            this.shouldRenderDynamic
                ? t.callExpression(
                    t.arrowFunctionExpression([], 
                        new ES6ScopedTransform(this).output
                    ), []
                )
                : this.classifyChildren().output
        )
    }

    DebuggerStatement(path){
        throw path.buildCodeFrameError("Cannot place a debugger statement in simple do-block. This doesn't have it's own scope!")
    }

    VariableDeclaration(path){
        this.shouldRenderDynamic = true;
        super.VariableDeclaration(path);
    }
}

class ComponentFunctionExpression extends ComponentGenericExpression {

    didExitOwnScope(path){
        const parentFn = path.parentPath;
        const {params} = parentFn.node;

        let body;

        if(this.shouldRenderDynamic)
            body = new ES6ScopedTransform(this).output
        else {
            const { stats, output } = this.classifyChildren();
            body = t.blockStatement([
                ...stats,
                t.returnStatement(output)
            ])
        }

        parentFn.replaceWith(
            t.functionExpression(null, params, body)
        )
    }
}

class ES6ScopedTransform extends ES6FragmentTransform {
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

        return t.blockStatement([
            initAccumulator,
            ...this.stats,
            returnAccumulator
        ]);
    }
}