import t, { For, AssignmentExpression } from '@babel/types';
import { ElementInline, StackFrame } from 'internal';
import { Path } from 'types';
import { PossibleExceptions } from 'shared';

const Error = PossibleExceptions({
    AcceptsNoAssignments: "For block cannot accept Assignments",
    cantAssign: "Assignment of variable left of \"of\" must be Identifier or Destruture",
    notImplemented: "Only For-Of loop is currently implemented; complain to dev!"
})

export class ComponentFor extends ElementInline {
    constructor(
        public path: Path<For>, 
        public context: StackFrame){
            
        super(context);

        if(!path.isForOfStatement())
            throw Error.notImplemented(path)

        const body = path.get("body");
        const block = this.handleContentBody(body);

        if(block)
            body.replaceWith(
                t.expressionStatement(block));
    }

    AssignmentExpression(path: Path<AssignmentExpression>){
        Error.AcceptsNoAssignments(path);
    }
}