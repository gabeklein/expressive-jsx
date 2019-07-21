import { NodePath as Path } from '@babel/traverse';
import { doExpression, Expression, ExpressionStatement, Statement, isBlockStatement, blockStatement } from '@babel/types';
import { StackFrame } from 'parse';
import { ParseErrors } from 'shared';
import { BunchOf, DoExpressive, SequenceItem } from 'types';

import { ComponentIf } from './';

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

    constructor(context: StackFrame){
        this.context = context.create(this);
    }

    abstract ExpressionDefault(node: Expression): void;

    willEnter?(path?: Path): void;
    willExit?(path?: Path): void;
    wasAddedTo?<T extends TraversableBody>(element?: T): void;

    didEnterOwnScope(path: Path<DoExpressive>){
        const traversable = path.get("body").get("body")
        for(const item of traversable)
            this.parse(item);
    }

    didExitOwnScope?(path?: Path<DoExpressive>): void;

    handleContentBody(content: Statement){
        if(!isBlockStatement(content))
            content = blockStatement([content])

        const body = doExpression(content) as DoExpressive;
        body.meta = this as any;
        return body;
    }
    
    add(item: SequenceItem){
        this.sequence.push(item);
        if("wasAddedTo" in item
        && item.wasAddedTo)
            item.wasAddedTo(this);
    }

    parse(item: Path<Statement>){
        const content = item.isBlockStatement() ? item.get("body") : [item];
        for(const item of content)
            if(item.type in this) 
                (this as any)[item.type](item.node, item);
            else {
                throw Error.NodeUnknown(item, item.type)
            }
    }

    parseNodes(body: Statement){
        const content = isBlockStatement(body) ? body.body : [body];
        for(const item of content){
            if(item.type in this) 
                (this as any)[item.type](item);
            else throw Error.NodeUnknown(item, item.type)
        }
    }

    ExpressionStatement(
        node: ExpressionStatement){

        return this.Expression(node.expression)
    }

    Expression(
        node: Expression){
        const self = this as unknown as BunchOf<Function>

        if(node.type in this) 
            self[node.type](node);
        else if(this.ExpressionDefault) 
            this.ExpressionDefault(node);
        else 
            throw Error.ExpressionUnknown(node, node.type);
    }
}