const t = require('babel-types');
const { ComponentScopedFragment } = require('./component')

const { ES6FragmentTransform } = require("./transform.js");

const INIT_LOOP_TYPE = {
    of: t.forOfStatement,
    in: t.forInStatement
}

export class ComponentRepeating extends ComponentScopedFragment {
    constructor(path, parent, kind){
        super(parent)
        this.type = "ComponentRepeating"
        this.kind = kind || null;
        this.sourceNode = path.node;
        this.queueTransform(path)

        this.bubble("mayIncludeAccumulatingChildren")
    }

    dynamic(){
        return new DynamicLoopTransform(this).output
    }

    get ast(){
        return t.booleanLiteral(false)
    }

    queueTransform(path){
        let action = path.get("body").node;

        if(action.type != "BlockStatement")
            action = t.blockStatement([action])

        const doTransform = t.doExpression(action)

        doTransform.meta = this;

        path.replaceWith(
            t.expressionStatement(doTransform)
        )
    }

    didEnterOwnScope(path){
        this.body = path;
        super.didEnterOwnScope(path)
    }

}

class DynamicLoopTransform extends ES6FragmentTransform {

    constructor(target){
        super(target)

        const {
            body: { scope },
            use,
            kind,
            sourceNode
        } = target;

        this.src = target;
;
        use._accumulate = {
            args: this.acc = scope.generateUidIdentifier("loop")
        }

        this.data = Array.from(target.children)
        this.applyAll()
    }

    get output(){
        const { _Fragment, _createApplied } = this.src.use;
        // debugger
        return [
            ...this.generate(),
            t.expressionStatement(
                t.callExpression(
                    t.memberExpression(
                        this.src.parent.use._accumulate.args,
                        t.identifier("push")
                    ), [
                        t.callExpression(
                            _createApplied, [this.acc]
                        )
                    ]
                )
            )
        ];
    }

    get wrapped(){
        this.applyAll();
        return encapsulate(
            this.generate()
        );
    }

    encapsulate(inner){
        return  t.callExpression(
            t.arrowFunctionExpression(
                [ /*no parameters*/ ], 
                t.blockStatement(inner)
            ), [ /*no arguments*/ ]
        )
    }

    generate(){
        const {
            acc,
            src: {
                sourceNode: src,
                use: { _Fragment },
                kind
            }
        } = this;

        let loop;

        if(kind){
            loop = INIT_LOOP_TYPE[kind](
                src.left,
                src.right,
                t.blockStatement(this.stats)
            )
        } else {
            loop = t.forStatement(
                src.init,
                src.test,
                src.update,
                t.blockStatement(this.stats)
            )
        }

        return [
            t.variableDeclaration("const", [ 
                t.variableDeclarator(acc, t.arrayExpression([
                    _Fragment, t.objectExpression([])
                ]))
            ]),
            loop
        ]
    }
}
