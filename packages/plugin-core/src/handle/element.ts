import { NodePath as Path } from '@babel/traverse';
import {
    AssignmentExpression,
    BlockStatement,
    blockStatement,
    DebuggerStatement,
    doExpression,
    Expression,
    expressionStatement,
    For,
    FunctionDeclaration,
    IfStatement,
    Statement,
    UnaryExpression,
    UpdateExpression,
    VariableDeclaration,
} from '@babel/types';
import { AddElementsFromExpression, ApplyNameImplications, StackFrame } from 'parse';
import { inParenthesis, ParseErrors } from 'shared';
import { BunchOf, DoExpressive, InnerContent } from 'types';

import { AttributeBody, ComponentFor, ComponentIf, ElementModifier, ExplicitStyle, Modifier, Prop } from './';

const Error = ParseErrors({
    PropNotIdentifier: "Assignment must be identifier name of a prop.",
    AssignmentNotEquals: "Only `=` assignment may be used here.",
    BadShorthandProp: "\"+\" shorthand prop must be an identifier!",
    UnarySpaceRequired: "Unary Expression must include a space between {1} and the value.",
    StatementInElement: "Statement insertion not implemented while within elements!",
    MinusMinusNotImplemented: "-- is not implemented as an integration statement."
})

export class ElementInline extends AttributeBody {
    
    doBlock?: DoExpressive
    primaryName?: string;
    children = [] as InnerContent[];
    explicitTagName?: string;
    modifiers = [] as Modifier[];
    data = {} as BunchOf<any>;

    adopt(child: InnerContent){
        const index = this.children.push(child);
        if("context" in child && child.context instanceof StackFrame)
            child.context.resolveFor(index);
        this.add(child);
    }

    ExpressionDefault(path: Path<Expression>){
        if(inParenthesis(path.node))
            this.adopt(path.node)
        else
            AddElementsFromExpression(path.node, this);
    }

    ElementModifier(mod: ElementModifier){
        this.context.elementMod(mod);
    }

    IfStatement(path: Path<IfStatement>){
        const mod = new ComponentIf(path, this.context);
        this.adopt(mod)
    }

    ForInStatement(path: Path<For>){
        this.ForStatement(path)
    }

    ForOfStatement(path: Path<For>){
        this.ForStatement(path)
    }

    ForStatement(path: Path<For>){
        this.adopt(
            new ComponentFor(path, this.context)
        )
    }

    BlockStatement(path: Path<BlockStatement>){
        const blockElement = new ElementInline(this.context);
        const block = blockStatement(path.node.body);
        const doExp = doExpression(block) as DoExpressive;

        ApplyNameImplications("block", blockElement);
        this.add(blockElement)

        blockElement.doBlock = doExp;
        doExp.meta = blockElement;
        path.replaceWith(
            expressionStatement(doExp)
        )
    }

    UpdateExpression(path: Path<UpdateExpression>){
        const value = path.get("argument");
        const op = path.node.operator;

        if(path.node.start !== value.node.start! - 3)
            throw Error.UnarySpaceRequired(path, op)

        if(op !== "++")
            throw Error.MinusMinusNotImplemented(path)

        this.add(
            new Prop(false, value.node)
        )
    }
    
    UnaryExpression(path: Path<UnaryExpression>){
        const value = path.get("argument");
        const op = path.node.operator

        switch(op){
            case "delete":
                this.ExpressionAsStatement(value);
                return

            case "void":
            case "!":
                this.ExpressionDefault(path)
                return 
        }

        if(path.node.start !== value.node.start! - 2)
            throw Error.UnarySpaceRequired(path, op)

        switch(op){
            case "+": 
                if(!value.isIdentifier())
                    throw Error.BadShorthandProp(path);
                this.add(
                    new Prop(value.node.name, value.node)
                );
            break;

            case "-":
                this.add(
                    new Prop("className", value.node)
                );
            break;

            case "~": 
                this.add(
                    new ExplicitStyle(false, value.node)
                );
            break
        }
    }

    ExpressionAsStatement(path: Path<Expression>){
        throw Error.StatementInElement(path)
    }

    AssignmentExpression(path: Path<AssignmentExpression>){
        if(path.node.operator !== "=") 
            throw Error.AssignmentNotEquals(path)

        const left = path.get("left");
        
        if(!left.isIdentifier())
            throw Error.PropNotIdentifier(left)

        let { name } = left.node;

        this.insert(
            new Prop(name, path.get("right").node));
    }
}

export class ComponentContainer extends ElementInline {

    statements = [] as Statement[];

    ExpressionAsStatement(path: Path<Expression>){
        this.statements.push(expressionStatement(path.node));
    }

    VariableDeclaration(path: Path<VariableDeclaration>){
        this.statements.push(path.node);
    }

    DebuggerStatement(path: Path<DebuggerStatement>){
        this.statements.push(path.node);
    }

    FunctionDeclaration(path: Path<FunctionDeclaration>){
        this.statements.push(path.node);
    }
}