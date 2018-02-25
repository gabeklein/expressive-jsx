const t = require('babel-types');
const { ComponentFragment } = require('./component')
const { Shared, transform } = require("./shared");

const INIT_LOOP_TYPE = {
    of: t.forOfStatement,
    in: t.forInStatement
}

export class ComponentRepeating extends ComponentFragment {

    inlineType = "child"
    insert = "fragment"
    precedence = -1
    shouldOutputDynamic = true;

    static applyTo(parent, src, kind){
        parent.add(
            new this(src, parent, kind)
        )
    }

    mayReceiveAttributes(){
        this.shouldOutputDynamic = true;
        return false;
    }

    constructor(path, parent, kind){
        const node = path.node;
        super(path, parent)
        this.scope = path.scope;
        this.kind = kind || null;
        this.node = node;
        this.path = path
    }

    didEnterOwnScope(path){
        super.didEnterOwnScope(path)
        Shared.state.expressive_for_used = true;
        this.body = path;
    }

    transform(){
        const accumulator = this.scope.generateUidIdentifier("l");
        const { node } = this;

        let { body, output } = this.collateChildren(
            function onAttributes(x){
                //error
            }
        )

        let key = this.keyConstruct;
        const fragment_props = key
            ? [ t.objectProperty( t.identifier("key"), key ) ]
            : []

        output = output.length > 0
            ? transform.createFragment(output, fragment_props)
            : t.booleanLiteral(false)

        body = t.blockStatement([
            ...body,
            t.expressionStatement(
                t.callExpression(
                    t.memberExpression(accumulator, t.identifier("push")), 
                    [ output ]
                )
            )
        ]);

        const loop = this.kind
            ? INIT_LOOP_TYPE[this.kind](
                node.left,
                node.right,
                body
            )
            : t.forStatement(
                node.init,
                node.test,
                node.update,
                body
            );

        if(!key){
            key = t.identifier("key")
            loop.expressive_setKey = (name) => {
                fragment_props.push(
                    t.objectProperty(t.identifier("key"), name)
                )
            }
        }

        const factory = [
            transform.declare("const", accumulator, t.arrayExpression([])),
            loop
        ]

        const product = 
            this.insert == "fragment" ?
                t.callExpression( Shared.createIterated, [accumulator] ) :
            this.insert == "array" ?
                accumulator :
                null;

        return { factory, product }
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

    AssignmentExpression(path){
        if(path.get("left").isIdentifier()){
            const {name} = path.node.left;
            if(name == "key")
                this.keyConstruct = path.node.right;
            else if(name == "insert"){
                if(path.get("right").isStringLiteral()){
                    const { value } = path.node.right;
                    if(~["fragment", "array"].indexOf(value))
                        this.insert = value;
                    else throw path.buildCodeFrameError(`
                        Invalid value '${value}' for insert property of for-loop. Acceptable value is "array" or "fragment" (default).
                    `)
                }
                else throw path.buildCodeFrameError(`
                    Property "insert" in for-loop must be a string with value [ fragment | array ]
                `)
            }
            else super.AssignmentExpression(path);
        }
        else super.AssignmentExpression(path);
    }
}