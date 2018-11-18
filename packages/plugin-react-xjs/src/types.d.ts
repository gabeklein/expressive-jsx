import { Expression, Identifier, SpreadElement, Statement, TemplateLiteral, BlockStatement, LabeledStatement, NumericLiteral, ExpressionStatement, Program, DoExpression, ClassMethod, ArrayExpression } from "@babel/types";
import { NodePath as Path } from "@babel/traverse";
import { StackFrame } from "./scope";

export type ArrayItem = Expression | SpreadElement;

export interface ElementSyntax {
    product: Expression,
    factory?: Statement[]
}

export interface ElementInlcusion {
    inlineType: string
    transform?: () => ElementSyntax
}

export interface ExpressiveElementChild extends ElementInlcusion {
    precedence?: number;
}

// interface TraversableHandler {
//     [type: string]: (node: Path) => void
// }

export interface XReactTag {
    head?: true;
    name: string;
    path?: Path<Identifier>
}

export interface ComponentRecipient {
    context: StackFrame
    children: ElementInlcusion[];

}