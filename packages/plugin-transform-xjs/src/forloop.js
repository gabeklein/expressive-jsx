const t = require('@babel/types');
const { ComponentGroup } = require('./component')
const { Shared, transform, ensureUIDIdentifier } = require("./shared");

const INIT_LOOP_TYPE = {
    of: t.forOfStatement,
    in: t.forInStatement
}

export class ComponentRepeating extends ComponentGroup {

    inlineType = "child"
    insert = "fragment"
    // precedence = -1
    // shouldOutputDynamic = true;

    static applyTo(parent, src, kind){
        parent.add(
            new this(src, parent, kind)
        )
    }

    AssignmentExpression(path){
        throw path.buildCodeFrameError("Props have nothing to apply to here!")
    }

    mayReceiveAttributes(){
        this.shouldOutputDynamic = true;
        return false;
    }

    constructor(path, parent, kind){
        const node = path.node;

        super();
        this.scope = path.scope;
        this.kind = kind || null;
        this.node = node;
        this.path = path;
        this.left = path.get("left");
        this.insertDoIntermediate(path)
    }

    didEnterOwnScope(path){
        super.didEnterOwnScope(path)
        this.body = path;
    }

    transform(){
        if(this.kind == "of")
            return this.toMap()
        else
            return this.toFactory();
    }

    toMap(){
        let { left, right } = this.node;

        if(left.type == "VariableDeclaration")
            throw this.left.buildCodeFrameError("'const' not supported when loop outputs a map function")
            // left = left.declarations[0].id;
            
        let { body, output } = this.collateChildren(
            function onAttributes(x){}
        )

        let key;

        if(right.type == "BinaryExpression" && right.operator == "in")
            ({ left: key, right } = right);
        else key = ensureUIDIdentifier.call(this.path.scope, "i");

        const fragment_props = [ t.objectProperty( t.identifier("key"), key ) ];

        output = output.length > 0
            ? transform.createFragment(output, fragment_props)
            : t.booleanLiteral(false)

        body = t.blockStatement([
            ...body,
            t.returnStatement(output)
        ]);
    
        return {
            product: t.callExpression(
                t.memberExpression(
                    right, t.identifier("map")
                ), [ 
                    t.arrowFunctionExpression([left, key], body)
                ]
            )
        }
    }

    toFactory(){
        Shared.state.expressive_for_used = true;

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
                t.callExpression( Shared.stack.helpers.createIterated, [accumulator] ) :
            this.insert == "array" ?
                accumulator :
                null;

        return { factory, product }
    }

    insertDoIntermediate(path){
        let action = path.get("body").node;

        if(action.type != "BlockStatement")
            action = t.blockStatement([action])

        super.insertDoIntermediate(path, action)
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