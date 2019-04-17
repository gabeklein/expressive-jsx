import { ArrowFunctionExpression, VariableDeclaration, Statement } from '@babel/types';
import { ApplyNameImplications, ElementInline, StackFrame } from 'internal';
import { DoExpressive, Path } from 'types';

export class ComponentExpression extends ElementInline {

    exec?: Path<ArrowFunctionExpression>;
    statements = [] as Path<Statement>[];

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
        this.context.resolve(this.name);
    }

    VariableDeclaration(path: Path<VariableDeclaration>){
        this.statements.push(path);
    }
}