// import * as t from "@babel/types";
import { AssignmentExpression, Expression } from '@babel/types';
import { AttributeRecipient } from './component';
import { ApplyElementExpression, StackFrame } from './internal';
import { Prop, ExplicitStyle, SpreadAttribute, Attribute, NonComponent, InnerStatement } from './item';
import { Path } from './types';

type Stack<T> = T[][];
type Element = ElementInline | NonComponent | InnerStatement;
type SequenceItem = Element | Attribute;
type Statement = ElementsExpression | InnerStatement;

class ElementsExpression {
    elements = [] as Element[];
    
    push(e: Element){
        this.elements.push(e);
    }
}

export class ElementInline extends AttributeRecipient {

    primaryName?: string;
    tagName?: string;
    context?: StackFrame;

    ExpressionDefault(path: Path<Expression>){
        ApplyElementExpression(path, this);
    }

    AssignmentExpression(path: Path<AssignmentExpression>){
        const left = path.get("left");
        
        if(!left.isIdentifier())
            throw left.buildCodeFrameError("Assignment must be identifier name of a prop.")

        if(path.node.operator !== "=") 
            path.buildCodeFrameError("Only `=` assignment may be used here.")

        const right = path.get("right");

        const prop = new Prop(left.node.name, right.node);

        this.apply(prop)
        this.sequence.push(prop)
    }

    doStuff(){
        let style_current: Array<ExplicitStyle> = [];
        const style_static: Array<ExplicitStyle> = [];
        const style_stack: Stack<ExplicitStyle> = [ style_current ];
        const statement_stack: Array<Statement> = [ new ElementsExpression ];

        for(const item of this.sequence as SequenceItem[]){
            if(item instanceof ElementInline
            || item instanceof NonComponent){
                let top = statement_stack[statement_stack.length - 1];
                if(!(top instanceof ElementsExpression))
                    statement_stack.push(
                        top = new ElementsExpression()
                    );
                
                top.push(item); 
            } else 
            
            if(item instanceof InnerStatement){
                statement_stack.push(item);
            } else
            
            if(item.overriden !== true){
                if(item instanceof ExplicitStyle){
                    ( item.value && style_stack.length == 1
                        ? style_static
                        : style_current
                    ).push(item)
                } else 

                if(item instanceof SpreadAttribute){

                } else

                if(item instanceof Prop){

                }
            }
        }
    }
}