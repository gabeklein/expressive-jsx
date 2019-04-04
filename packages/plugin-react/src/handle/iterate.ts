import { Path as Path } from '@babel/traverse';
import t, {
    BlockStatement,
    CallExpression,
    Expression,
    ForInStatement,
    ForOfStatement,
    ForStatement,
    ForXStatement,
    Identifier,
    PatternLike,
    StringLiteral
} from '@babel/types';
import { ComponentFor, ElementInline, ParseErrors } from '@expressive/babel-plugin-core';
import { ensureUIDIdentifier } from 'helpers';
import { ElementReact, GenerateJSX } from 'internal';
import { isIdentifierElement } from 'types';

const Error = ParseErrors({
    cantAssign: "Assignment of variable left of \"of\" must be Identifier or Destruture",
    notImplemented: "Only For-Of loop is currently implemented; complain to dev!"
})

export class ElementIterate 
    extends ElementReact<ComponentFor> {

    type: "ForOfStatement" | "ForInStatement" | "ForStatement";
    mayCollapseContent?: boolean;
    key?: Identifier;
    left?: PatternLike;
    right?: Expression;

    constructor(source: ComponentFor){
        super(source);
        this.type = source.path.type as any;
    };
    
    toExpression(): CallExpression | StringLiteral {
        if(this.type != "ForOfStatement")
            return t.stringLiteral(this.type + " NOT IMPLEMENTED");

        let body: BlockStatement | Expression;

        const { key, mayCollapseContent } = this;

        const Generator = this.context.Generator as GenerateJSX;

        body = Generator.container(this, !mayCollapseContent && key);

        if(this.statements.length)
            body = t.blockStatement([
                ...this.statements,
                t.returnStatement(body)
            ])
    
        return t.callExpression(
            t.memberExpression(this.right!, t.identifier("map")), 
            [ 
                t.arrowFunctionExpression([this.left!, key!], body)
            ]
        )
    }

    willParse(){
        const { path } = this.source;

        if(path.isForStatement())
            this.parseVanillaFor(path);
        else 
            this.parseForX(path as Path<ForXStatement>);
    }

    parseForX(Loop: Path<ForOfStatement | ForInStatement>){
        let left = Loop.get("left");
        let right = Loop.get("right");
        let key: Identifier;

        if(left.isVariableDeclaration())
            left = left.get("declarations")[0].get("id")

        if(left.isIdentifier() 
        || left.isObjectPattern() 
        || left.isArrayPattern())
            void 0;
        else 
            throw Error.cantAssign(left);

        if(right.isBinaryExpression({operator: "in"})){
            key = right.node.left as Identifier
            right = right.get("right")
        }
        else key = t.identifier(
            ensureUIDIdentifier.call(this.source.path.scope, "i")
        )

        this.key = key;
        this.left = left.node;
        this.right = right.node;

        const inner = this.source.children;
        const [ element ] = inner;

        if(inner.length === 1
        && element instanceof ElementInline
        && isIdentifierElement.test(element.name!) === false
        && element.props.key === undefined){
            element.Prop("key", this.key);
            this.mayCollapseContent = true;
        }
    }

    parseVanillaFor(Loop: Path<ForStatement>){
        throw Error.notImplemented(Loop)
    }
}