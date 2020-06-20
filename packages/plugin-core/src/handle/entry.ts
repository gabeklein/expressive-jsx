import { NodePath as Path } from '@babel/traverse';
import { ArrowFunctionExpression, Statement } from '@babel/types';
import { applyNameImplications, StackFrame } from 'parse';
import { DoExpressive, InnerContent, SequenceItem } from 'types';

import { ComponentConsequent, ComponentContainer } from './';

export class ComponentExpression extends ComponentContainer {

    exec?: Path<ArrowFunctionExpression>;
    statements = [] as Statement[];
    forwardTo?: ComponentConsequent;
    
    constructor(
        name: string,
        context: StackFrame,
        path: Path<DoExpressive>,
        exec?: Path<ArrowFunctionExpression>){

        super(context);

        this.context.currentComponent = this;

        if(exec){
            this.exec = exec;
        }

        this.name = name;
        this.explicitTagName = "div";

        if(/^[A-Z]/.test(name))
            applyNameImplications(name, this);

        path.node.meta = this;
        this.context.resolveFor(this.name);
    }

    add(item: SequenceItem){
        if(this.forwardTo)
            this.forwardTo.add(item)
        else
            super.add(item)
    }

    adopt(child: InnerContent){
        if(this.forwardTo){
            this.forwardTo.adopt(child)
            return 
        }
        super.adopt(child)
    }
}