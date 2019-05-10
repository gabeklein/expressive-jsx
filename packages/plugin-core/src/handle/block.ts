import { NodePath as Path } from '@babel/traverse';
import { Expression, ExpressionStatement, Statement, doExpression } from '@babel/types';
import { ComponentIf } from 'handle';
import { StackFrame } from 'parse';
import { ParseErrors } from 'shared';
import { BunchOf, DoExpressive, SequenceItem } from 'types';

const Error = ParseErrors({
    ExpressionUnknown: "Unhandled expressionary statement of type {1}",
    NodeUnknown: "Unhandled node of type {1}",
    BadInputModifier: "Modifier input of type {1} not supported here!"
})

export abstract class TraversableBody {

    context: StackFrame
    name?: string;
    parent?: TraversableBody | ComponentIf;
    sequence = [] as SequenceItem[];

    willEnter?(path?: Path): void;
    willExit?(path?: Path): void;
    wasAddedTo?<T extends TraversableBody>(element?: T): void;

    constructor(
        context: StackFrame){
        this.context = context.create(this);
    }

    didEnterOwnScope(path: Path<DoExpressive>){
        const body = path.get("body.body") as Path<Statement>[];
        for(const item of body)
            this.parse(item);
    }

    didExitOwnScope?(path: Path<DoExpressive>): void;

    handleContentBody(content: Path<Statement>){
        if(content.isBlockStatement()){
            const body = doExpression(content.node) as DoExpressive;
            body.meta = this as any;
            return body;
        }
        else {
            this.parse(content);
            const last = this.sequence[this.sequence.length - 1];
            if(last instanceof TraversableBody)
                last.parent = this;
        }
    }
    
    add(item: SequenceItem){
        this.sequence.push(item);
        if("wasAddedTo" in item
        && item.wasAddedTo)
            item.wasAddedTo(this);
    }

    parse(item: Path<Statement>){
        if(item.type in this) 
            (this as any)[item.type](item);
        else throw Error.NodeUnknown(item, item.type)
    }

    abstract ExpressionDefault(path: Path<Expression>): void;

    ExpressionStatement(
        path: Path<ExpressionStatement>){

        return this.Expression(path.get("expression"))
    }

    Expression(
        path: Path<Expression>){
        const self = this as unknown as BunchOf<Function>

        if(path.type in this) 
            self[path.type](path);
        else if(this.ExpressionDefault) 
            this.ExpressionDefault(path);
        else 
            throw Error.ExpressionUnknown(path, path.type);
    }
}