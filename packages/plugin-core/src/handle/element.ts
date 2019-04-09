import { AssignmentExpression, Expression, For, IfStatement, TemplateLiteral } from '@babel/types';
import {
    AddElementsFromExpression,
    AttributeBody,
    ComponentFor,
    ComponentIf,
    ElementModifier,
    InnerContent,
    inParenthesis,
    ParseErrors,
} from 'internal';
import { DoExpressive, Path } from 'types';

const Error = ParseErrors({
    PropNotIdentifier: "Assignment must be identifier name of a prop.",
    AssignmentNotEquals: "Only `=` assignment may be used here."
})

export class ElementInline extends AttributeBody {
    
    doBlock?: DoExpressive
    primaryName?: string;
    multilineContent?: Path<TemplateLiteral>;
    children = [] as InnerContent[];
    explicitTagName?: string;
    modifiers = [] as ElementModifier[];

    adopt(child: InnerContent){
        this.children.push(child);
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
        this.adopt(
            new ComponentIf(path, this)
        )
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

    AssignmentExpression(path: Path<AssignmentExpression>){
        if(path.node.operator !== "=") 
            throw Error.AssignmentNotEquals(path)

        const left = path.get("left");
        
        if(!left.isIdentifier())
            throw Error.PropNotIdentifier(left)

        let { name } = left.node;

        this.Prop(name, undefined, path.get("right"));
    }
}