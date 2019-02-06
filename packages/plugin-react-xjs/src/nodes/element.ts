import { AssignmentExpression, Expression, TemplateLiteral } from '@babel/types';

import { ApplyElementExpression, AttributeBody, WhenSkyIsFalling, Prop } from '../internal';
import { Path } from '../internal/types';

const ERROR = WhenSkyIsFalling({
    PropNotIdentifier: "Assignment must be identifier name of a prop.",
    AssignmentNotEquals: "Only `=` assignment may be used here."
})

export class ElementInline extends AttributeBody {

    primaryName?: string;
    tagName?: string;
    unhandledQuasi?: Path<TemplateLiteral>;

    ExpressionDefault(path: Path<Expression>){
        ApplyElementExpression(path, this);
    }

    AssignmentExpression(path: Path<AssignmentExpression>){
        const left = path.get("left");
        
        if(!left.isIdentifier())
            throw ERROR.PropNotIdentifier(left)

        if(path.node.operator !== "=") 
            throw ERROR.AssignmentNotEquals(path)

        const right = path.get("right");

        const prop = new Prop(left.node.name, right.node);

        this.apply(prop)
    }
}

