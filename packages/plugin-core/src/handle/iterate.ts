import { NodePath as Path } from '@babel/traverse';
import {
    AssignmentExpression,
    For,
    ForXStatement,
    isForXStatement,
    isIdentifier,
    isVariableDeclaration,
} from '@babel/types';
import { StackFrame } from 'parse';

import { ComponentContainer } from './';

export class ComponentFor extends ComponentContainer {

    node: For

    constructor(
        public path: Path<For>, 
        public context: StackFrame){
            
        super(context);

        this.node = path.node
        this.name = this.generateName();
        this.doBlock = this.handleContentBody(path.node.body);
    }

    private generateName(){
        const { node } = this;
        if(isForXStatement(node)){
            let { left, right } = this.node as ForXStatement;
            const name = [];
    
            if(isVariableDeclaration(left))
                left = left.declarations[0].id;
    
            if(isIdentifier(left))
                name.push(left.name);
    
            name.push(node.type == "ForInStatement" ? "in" : "of");
    
            if(isIdentifier(right))
                name.push(right.name);

            return name.reduce(
                (acc, w) => acc + w[0].toUpperCase() + w.slice(1),
                "for"
            )
        }
        else 
            return "for"
    }

    AssignmentExpression(path: AssignmentExpression){
        throw new Error("For block cannot accept Assignments");
    }

    Prop(){
        void 0
    }
}