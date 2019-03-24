import { ApplyElementExpression, ComponentIf, AttributeBody, PossibleExceptions, ComponentFor } from 'internal';
import { Path } from 'types';

const Error = PossibleExceptions({
    PropNotIdentifier: "Assignment must be identifier name of a prop.",
    AssignmentNotEquals: "Only `=` assignment may be used here."
})

export class ElementInline extends AttributeBody {

    primaryName?: string;
    tagName?: string;
    multilineContent?: Path<TemplateLiteral>;

    ExpressionDefault(path: Path<Expression>){
        ApplyElementExpression(path, this);
    }

    IfStatement(path: Path<IfStatement>){
        this.add(
            new ComponentIf(path, this)
        )
    }

    AssignmentExpression(path: Path<AssignmentExpression>){
        const left = path.get("left");
        
        if(!left.isIdentifier())
            throw Error.PropNotIdentifier(left)

        if(path.node.operator !== "=") 
            throw Error.AssignmentNotEquals(path)

        const right = path.get("right");

        const prop = new Prop(left.node.name, right.node);

        this.apply(prop)
    }
}