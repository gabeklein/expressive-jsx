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
    identifier,
    IfStatement,
    isDoExpression,
    isIdentifier,
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

    ExpressionDefault(node: Expression){
        if(inParenthesis(node))
            this.adopt(node)
        else 
            AddElementsFromExpression(node, this);
    }

    ElementModifier(mod: ElementModifier){
        this.context.elementMod(mod);
    }

    IfStatement(_: IfStatement, path: Path<IfStatement>){
        const mod = new ComponentIf(path, this.context);
        this.adopt(mod)
        path.replaceWith(
            blockStatement(mod.doBlocks!)
        )
    }

    ForInStatement(_: For, stat: Path<For>){
        this.ForStatement(_, stat)
    }

    ForOfStatement(_: For, stat: Path<For>){
        this.ForStatement(_, stat)
    }

    ForStatement(_: For, stat: Path<For>){
        const element = new ComponentFor(stat, this.context);
        this.adopt(element)
        const { doBlock } = element;
        if(doBlock)
            stat.replaceWith(doBlock)
    }

    BlockStatement(node: BlockStatement, path: Path<BlockStatement>){
        const blockElement = new ElementInline(this.context);
        const block = blockStatement(node.body);
        const doExp = doExpression(block) as DoExpressive;

        ApplyNameImplications("block", blockElement);
        this.add(blockElement)

        blockElement.doBlock = doExp;
        doExp.meta = blockElement;
        path.replaceWith(
            expressionStatement(doExp)
        )
    }

    UpdateExpression(node: UpdateExpression){
        const value = node.argument;
        const op = node.operator;

        if(node.start !== value.start! - 3)
            throw Error.UnarySpaceRequired(node, op)

        if(op !== "++")
            throw Error.MinusMinusNotImplemented(node)

        this.add(
            new Prop(false, value)
        )
    }
    
    UnaryExpression(node: UnaryExpression){
        const value = node.argument;
        const op = node.operator

        switch(op){
            case "delete":
                this.ExpressionAsStatement(value);
                return

            case "void":
            case "!":
                this.ExpressionDefault(node)
                return 
        }

        if(node.start !== value.start! - 2)
            throw Error.UnarySpaceRequired(node, op)

        switch(op){
            case "+": 
                if(!isIdentifier(value))
                    throw Error.BadShorthandProp(node);
                this.add(
                    new Prop(value.name, value)
                );
            break;

            case "-":
                this.add(
                    new Prop("className", value)
                );
            break;

            case "~": 
                this.add(
                    new ExplicitStyle(false, value)
                );
            break
        }
    }

    ExpressionAsStatement(node: Expression){
        throw Error.StatementInElement(node)
    }

    AssignmentExpression(node: AssignmentExpression){
        if(node.operator !== "=") 
            throw Error.AssignmentNotEquals(node)

        let { left, right } = node;
        
        if(!isIdentifier(left))
            throw Error.PropNotIdentifier(left)

        let { name } = left;

        if(isDoExpression(right)){
            const prop = new Prop(name, identifier("undefined"));
            (<DoExpressive>right).expressive_parent = prop;
            this.insert(prop);
        }

        else 
            this.insert(new Prop(name, right));
    }
}

export class ComponentContainer extends ElementInline {

    statements = [] as Statement[];

    ExpressionAsStatement(node: Expression){
        this.statements.push(expressionStatement(node));
    }

    VariableDeclaration(node: VariableDeclaration){
        this.statements.push(node);
    }

    DebuggerStatement(node: DebuggerStatement){
        this.statements.push(node);
    }

    FunctionDeclaration(node: FunctionDeclaration){
        this.statements.push(node);
    }
}