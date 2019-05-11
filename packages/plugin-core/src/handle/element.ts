import { NodePath as Path } from '@babel/traverse';
import { AssignmentExpression, Expression, For, IfStatement, TemplateLiteral, UnaryExpression } from '@babel/types';
import { AddElementsFromExpression, StackFrame } from 'parse';
import { inParenthesis, ParseErrors } from 'shared';
import { BunchOf, DoExpressive, InnerContent } from 'types';

import { AttributeBody, ComponentFor, ComponentIf, ElementModifier, ExplicitStyle, Modifier, Prop } from './';

const Error = ParseErrors({
    PropNotIdentifier: "Assignment must be identifier name of a prop.",
    AssignmentNotEquals: "Only `=` assignment may be used here.",
    BadShorthandProp: "\"+\" shorthand prop must be an identifier!",
    UnarySpaceRequired: "Unary Expression must include a space between {1} and the value."
})

export class ElementInline extends AttributeBody {
    
    doBlock?: DoExpressive
    primaryName?: string;
    multilineContent?: Path<TemplateLiteral>;
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
        if(inParenthesis(path))
            this.adopt(path)
        else
            AddElementsFromExpression(path, this);
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
    
    UnaryExpression(path: Path<UnaryExpression>){
        const unary = path as Path<UnaryExpression>;
        const value = path.get("argument") as Path<Expression>;
        const op = unary.node.operator

        switch(op){
            case "void":
            case "!":
                this.ExpressionDefault(path)
                return 
        }

        if(unary.node.start !== value.node.start! - 2)
            throw Error.UnarySpaceRequired(unary, op)

        switch(op){
            case "+": 
                if(value.isIdentifier())
                    this.add(
                        new Prop(value.node.name, value.node)
                    );
                else 
                    throw Error.BadShorthandProp(unary);
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

    AssignmentExpression(path: Path<AssignmentExpression>){
        if(path.node.operator !== "=") 
            throw Error.AssignmentNotEquals(path)

        const left = path.get("left");
        
        if(!left.isIdentifier())
            throw Error.PropNotIdentifier(left)

        let { name } = left.node;

        this.insert(
            new Prop(name, undefined, path.get("right")));
    }
}