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
    StringLiteral,
} from '@babel/types';
import { ComponentFor, ElementInline, ParseErrors } from '@expressive/babel-plugin-core';
import { ContainerJSX } from 'internal';
import { ensureUIDIdentifier } from 'runtime';
import { createFragment } from 'syntax';

const Error = ParseErrors({
    cantAssign: "Assignment of variable left of \"of\" must be Identifier or Destruture",
    notImplemented: "Only For-Of loop is currently implemented; complain to dev!"
})

export class IterateJSX 
    extends ContainerJSX<ComponentFor> {

    type: "ForOfStatement" | "ForInStatement" | "ForStatement";
    mayCollapseContent?: boolean;
    key?: Identifier;
    left?: PatternLike;
    right?: Expression;

    constructor(source: ComponentFor){
        super(source);
        this.type = source.path.type as any;
    };

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
        else key = ensureUIDIdentifier.call(this.source.path.scope, "i");

        this.key = key;
        this.left = left.node;
        this.right = right.node;

        const inner = this.source.children;
        const [ element ] = inner;

        if(inner.length === 1
        && element instanceof ElementInline
        && /^[A-Z]/.test(element.tagName!) === false
        && element.props.key === undefined){
            element.Prop("key", this.key);
            this.mayCollapseContent = true;
        }
    }

    parseVanillaFor(Loop: Path<ForStatement>){
        throw Error.notImplemented(Loop)
    }

    toElement(){
        const output = this.toExpression();
        return true
            ? t.jsxExpressionContainer(output)
            : t.jsxSpreadChild(output);
    }

    toExpression(): CallExpression | StringLiteral {

        if(this.type != "ForOfStatement")
            return t.stringLiteral(this.type + " NOT IMPLEMENTED");

        const { children } = this;

        let body: BlockStatement | Expression = 
            children.length == 1 && this.mayCollapseContent ?
                children[0].toExpression() :
            children.length == 0 ?
                t.booleanLiteral(false) :
                createFragment(this.jsxChildren, this.key);

        if(this.statements.length)
            body = t.blockStatement([
                ...this.statements,
                t.returnStatement(body)
            ])
    
        return t.callExpression(
            t.memberExpression(this.right!, t.identifier("map")), 
            [ 
                t.arrowFunctionExpression([this.left!, this.key!], body)
            ]
        )
    }
}