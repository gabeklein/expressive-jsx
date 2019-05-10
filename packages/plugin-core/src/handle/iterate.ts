import { NodePath as Path } from '@babel/traverse';
import t, { AssignmentExpression, For } from '@babel/types';
import { ElementInline } from 'handle';
import { StackFrame } from 'internal';
import { ParseErrors } from 'shared';

const Error = ParseErrors({
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
        const doBlock = this.handleContentBody(body);

        if(doBlock)
            body.replaceWith(
                t.expressionStatement(doBlock));
    }

    AssignmentExpression(path: Path<AssignmentExpression>){
        Error.AcceptsNoAssignments(path);
    }

    Prop(){
        void 0
    }
}