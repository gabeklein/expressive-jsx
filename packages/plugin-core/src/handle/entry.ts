import { NodePath as Path } from '@babel/traverse';
import {
    ArrowFunctionExpression,
    DebuggerStatement,
    FunctionDeclaration,
    Statement,
    VariableDeclaration,
} from '@babel/types';
import { ComponentConsequent, ElementInline } from 'handle';
import { ApplyNameImplications, StackFrame } from 'parse';
import { DoExpressive, InnerContent, SequenceItem } from 'types';

export class ComponentExpression extends ElementInline {

    exec?: Path<ArrowFunctionExpression>;
    statements = [] as Statement[];
    forwardTo?: ComponentConsequent;
    
    constructor(
        name: string,
        context: StackFrame,
        path: Path<DoExpressive>,
        exec?: Path<ArrowFunctionExpression>){

        super(context);

        if(exec){
            this.exec = exec;
        }

        this.name = name;
        this.explicitTagName = "div";

        if(/^[A-Z]/.test(name))
            ApplyNameImplications(name, this);

        path.node.meta = this;
        this.context.resolveFor(this.name);
    }

    add(item: SequenceItem){
        if(this.forwardTo){
            this.forwardTo.add(item)
            return 
        }
        super.add(item)
    }

    adopt(child: InnerContent){
        if(this.forwardTo){
            this.forwardTo.adopt(child)
            return 
        }
        super.adopt(child)
    }

    VariableDeclaration(path: Path<VariableDeclaration>){
        this.statements.push(path.node);
    }

    DebuggerStatement(path: Path<DebuggerStatement>){
        this.statements.push(path.node);
    }

    FunctionDeclaration(path: Path<FunctionDeclaration>){
        this.statements.push(path.node);
    }
}