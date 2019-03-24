import { AssignmentExpression, Expression, TemplateLiteral, IfStatement, For } from '@babel/types';
import { ApplyElementExpression, ComponentIf, AttributeBody, PossibleExceptions, ComponentFor } from 'internal';
import { Path } from 'types';
import { InnerContent } from 'generate/element';

const Error = PossibleExceptions({
    PropNotIdentifier: "Assignment must be identifier name of a prop.",
    AssignmentNotEquals: "Only `=` assignment may be used here."
})

export class ElementInline extends AttributeBody {

    primaryName?: string;
    tagName?: string;
    multilineContent?: Path<TemplateLiteral>;
    children = [] as InnerContent[];

    adopt(child: InnerContent){
        this.children.push(child);
        this.add(child);
    }

    ExpressionDefault(path: Path<Expression>){
        ApplyElementExpression(path, this);
    }

    IfStatement(path: Path<IfStatement>){
        this.adopt(
            new ComponentIf(path, this)
        )
    }

    ForStatement(path: Path<For>){
        this.adopt(
            new ComponentFor(path, this.context)
        )
    }

    ForInStatement(path: Path<For>){
        this.ForStatement(path)
    }

    ForOfStatement(path: Path<For>){
        this.ForStatement(path)
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