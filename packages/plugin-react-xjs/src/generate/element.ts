import { Attribute, ExplicitStyle, InnerStatement, NonComponent, Prop, SpreadItem, ElementInline } from '../internal';

export type SequenceItem = Element | Attribute;
export type Element = ElementInline | NonComponent<any>;
export type Statement = Stack | InnerStatement<any>;

export function GenerateJSX (
    element: ElementInline){

    const combined = new CollateJSX(element)
    void combined
    debugger;
}

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

class CollateJSX {

    current: Statement | false = false;
    items?: Stack<Element>;
    style?: AttributeStack<ExplicitStyle>;
    props = new AttributeStack<Prop>();

    statements = [] as Statement[];

    constructor(element: ElementInline){
        for(const item of element.sequence as SequenceItem[]){
            if(item instanceof ElementInline
            || item instanceof NonComponent)
                this.Content(item);
                
            else 
            if(item instanceof InnerStatement)
                this.Statement(item);
    
            else {
                let type = 
                    item instanceof Prop ? "props" :
                    item instanceof ExplicitStyle ? "style" :
                    item instanceof SpreadItem && item.name;
    
                if(!type) continue;
                else if(type == "props") this.Props(item);
                else if(type == "style") this.Style(item);
            }
        }
    }

    Statement(item: InnerStatement<any>){

    }

    Content(item: Element){
        if(!this.items)
            this.items = new Stack<Element>();
        
        this.items.add(item);
    }

    Props(item: Attribute){
        
    }

    Style(item: Attribute){
        
    }
}

void function collateStep(
    sequence: SequenceItem[]
){
    const S = [] as Array<Statement>;

    let current: Statement | false = false;
    let props: AttributeStack<Prop> | undefined = new AttributeStack();
    let style: AttributeStack<ExplicitStyle> | undefined;
    let items: Stack<Element> | undefined;

    for(const item of sequence){
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
                    current = new AttributeStack(style);
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
