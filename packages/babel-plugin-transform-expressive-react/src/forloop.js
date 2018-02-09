const t = require('babel-types');
const { ComponentFragment } = require('./component')
const { Shared, transform } = require("./shared");

const { ES6FragmentTransform } = require("./transform.js");

const INIT_LOOP_TYPE = {
    of: t.forOfStatement,
    in: t.forInStatement
}

export class ComponentRepeating extends ComponentFragment {

    groupType = "inner"
    precedence = -1

    static applyTo(parent, src, kind){
        parent.add(
            new this(src, parent, kind)
        )
    }

    constructor(path, parent, kind){
        super(parent)
        this.kind = kind || null;
        this.sourceNode = path.node;
        this.insertDoIntermediate(path)

        // this.bubble("mayIncludeAccumulatingChildren")
    }

    dynamic(){
        return new DynamicLoopTransform(this).output
    }

    get ast(){
        return t.booleanLiteral(false)
    }

    insertDoIntermediate(path){
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
        return transform.IIFE(
            this.generate()
        );
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
