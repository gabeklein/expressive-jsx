import { AssignmentExpression, Expression, TemplateLiteral } from '@babel/types';
import { AttributeRecipient } from './component';
import { ApplyElementExpression, StackFrame } from './internal';
import { Prop, ExplicitStyle, SpreadItem, Attribute, NonComponent, InnerStatement } from './item';
import { Path } from './types';
import { ParseErrors } from './shared';

type SequenceItem = Element | Attribute;
type Element = ElementInline | NonComponent<any>;
type Statement = Stack | InnerStatement<any>;

const ERROR = ParseErrors({
    PropNotIdentifier: "Assignment must be identifier name of a prop.",
    AssignmentNotEquals: "Only `=` assignment may be used here."
})

class Stack<Type = any>
    extends Array {

    readonly [i: number]: Type[] | SpreadItem;
    top?: Type[];

    add(x: Type){
        if(this.top)
            this.top.push(x)
        else 
            this.push(
                this.top = [x]
            )
    }

    break(x: SpreadItem){
        this.push(x);
        delete this.top;
    }
}

class AttributeStack<Type extends Attribute> 
    extends Stack<Type> {

    static = [] as Type[];
    doesReoccur?: true;

    constructor(previous?: AttributeStack<Type>){
        super();
        if(previous)
            previous.doesReoccur = true;
    }

    add(item: Type): void {
        if(item.value && this.length < 2)
            this.static.push(item);
        else
            super.add(item);
    }
}
export class ElementInline extends AttributeRecipient {

    primaryName?: string;
    tagName?: string;
    context?: StackFrame;
    unhandledQuasi?: Path<TemplateLiteral>;

    ExpressionDefault(path: Path<Expression>){
        ApplyElementExpression(path, this);
    }

    AssignmentExpression(path: Path<AssignmentExpression>){
        const left = path.get("left");
        
        if(!left.isIdentifier())
            throw ERROR.PropNotIdentifier(left)

        if(path.node.operator !== "=") 
            throw ERROR.AssignmentNotEquals(path)

        const right = path.get("right");

        const prop = new Prop(left.node.name, right.node);

        this.apply(prop)
    }

    collateStep(){
        const S = [] as Array<Statement>;

        let current: Statement | false = false;
        let style: AttributeStack<ExplicitStyle> | undefined;
        let props: AttributeStack<Prop> | undefined;
        let items: Stack<Element> | undefined;

        for(const item of this.sequence as SequenceItem[]){
            if(item instanceof ElementInline
            || item instanceof NonComponent){
                if(current !== items)
                    S.push(current = items = new Stack<Element>())
                
                items!.push(item); 
            } 
            
            else 
            if(item instanceof InnerStatement){
                current = false;
                S.push(item);
            }

            else {
                let type: string | undefined;

                if(item instanceof SpreadItem)
                    type = item.name;
                else if(item.overriden)
                    continue;

                if(type == "props" || item instanceof Prop){
                    if(current !== props)
                        current = new AttributeStack(props);
                    if(current !== props)
                        S.push(props = current as any);
                }
    
                else
                if(type == "style" || item instanceof ExplicitStyle){
                    if(current !== style)
                        style = new AttributeStack(style);
                    if(current !== style)
                        S.push(style = current as any);
                }

                if(current instanceof AttributeStack)
                if(type)
                    current.break(item as SpreadItem);
                else
                    current.push(item);
            } 
        }
        
        return S;
    }
}

