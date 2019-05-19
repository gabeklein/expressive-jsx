import { NodePath as Path } from '@babel/traverse';
import { AssignmentExpression, expressionStatement, For } from '@babel/types';
import { StackFrame } from 'parse';

import { ElementInline } from './';

export class ComponentFor extends ElementInline {

    node: For;

    constructor(
        public path: Path<For>, 
        public context: StackFrame){
            
        super(context);

        this.node = path.node;

        const body = path.get("body");
        const doBlock = this.handleContentBody(body);

        if(doBlock)
            body.replaceWith(
                expressionStatement(doBlock)
            );
    }

    AssignmentExpression(path: Path<AssignmentExpression>){
        throw new Error("For block cannot accept Assignments");
    }

    Prop(){
        void 0
    }
}