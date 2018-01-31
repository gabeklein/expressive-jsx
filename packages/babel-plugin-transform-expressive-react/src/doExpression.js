const t = require("babel-types")
const { Component, ComponentScoped } = require("./component")
const { ES6FragmentTransform } = require("./transform")

export function ComputeNewComponentExpression(path, state) {
    return path.parentPath.type == "ArrowFunctionExpression"
        ? new ComponentFunctionExpression(path, state)
        : new ComponentExpression(path, state)
}

class ComponentGenericExpression extends ComponentScoped {
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

    set doesHaveDynamicProperties(bool){
        this.shouldRenderDynamic = bool;
    }
}
 
class ComponentExpression extends ComponentGenericExpression {

    didExitOwnScope(path){

        const body = new ES6ScopedTransform(this).output;

        path.replaceWith(
            this.shouldRenderDynamic
                ? t.callExpression(
                    t.arrowFunctionExpression([], body), []
                )
                : this.innerAST()
        )
    }

    DebuggerStatement(path){
        throw path.buildCodeFrameError("Cannot place a debugger statement in simple do-block. This doesn't have it's own scope!")
    }

    // VariableDeclaration(path){
    //     throw path.buildCodeFrameError("Cannot declare variables in simple do-block. This doesn't have it's own scope!")
    // }
}

class ComponentFunctionExpression extends ComponentGenericExpression {

    didExitOwnScope(path){
        const parentFn = path.parentPath;
        const {params} = parentFn.node;
        const stats = [];
        for(const x of this.children){
            if(x.type == "Statement") stats.push(x.node);
            else break;
        }
        const body = this.shouldRenderDynamic
            ? new ES6ScopedTransform(this).output
            : t.blockStatement([
                ...stats,
                t.returnStatement(
                    this.innerAST()
                )
            ]);

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