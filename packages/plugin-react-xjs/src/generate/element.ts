import { Attribute, ExplicitStyle, InnerStatement, NonComponent, Prop, SpreadItem, ElementInline } from '../internal';

export type SequenceItem = Element | Prop | ExplicitStyle | SpreadItem;
export type Element = ElementInline | NonComponent<any>;
export type Statement = Stack | InnerStatement<any>;

export function GenerateJSX (
    element: ElementInline){

    const combined = new AssembleJSX(element)
    void combined
}

class Stack<Type = any, Spread = never>
    extends Array {

    readonly [i: number]: Type[] | Spread;
    top?: Type[] | Spread;

    add(x: Type){
       if(Array.isArray(this.top))
            this.top.push(x)
        else 
            this.push(
                this.top = [x]
            )
    }
}

class AttributeStack<Type extends Attribute> 
    extends Stack<Type, SpreadItem> {

    static = [] as Type[];
    doesReoccur?: true;

    constructor(previous?: AttributeStack<Type>){
        super();
        if(previous)
            previous.doesReoccur = true;
    }

    add(item: Type | SpreadItem): true | undefined {
        if(item instanceof SpreadItem){
            this.push(
                this.top = item
            );
            if(item.orderInsensitive)
                return true;
        }
        else 
        if(item.value 
        && this.length < 2 
        || (this.top as SpreadItem).orderInsensitive){
            this.static.push(item);
            return true;
        }
        else
            super.add(item);
    }
}

abstract class AssembleElement {

    abstract Statement(statement: Statement): void;
    abstract Content(child: Element): void;
    abstract Props(item: Prop | SpreadItem): void;
    abstract Style(item: ExplicitStyle | SpreadItem): void;

    constructor(element: ElementInline, expressionRequired?: true){
        this.collate(element.sequence as SequenceItem[]);
    }

    collate(sequence: SequenceItem[]){
        for(const item of sequence){
            if(item instanceof ElementInline
            || item instanceof NonComponent)
                this.Content(item);
                
            else 
            if(item instanceof InnerStatement)
                this.Statement(item);
    
            else {
                let spreadTarget: string | undefined;
                
                if(item instanceof SpreadItem)
                    spreadTarget = item.name;
                else if(item.overriden == true)
                    continue;
    
                if(item instanceof Prop 
                || spreadTarget == "props")
                    this.Props(item);

                else if(item instanceof ExplicitStyle 
                || spreadTarget == "style")
                    this.Style(item);
            }
        }
    }
}

class AssembleJSX extends AssembleElement {

    items = new Stack<Element>();
    style = new AttributeStack<ExplicitStyle>();
    props = new AttributeStack<Prop>();
    statements = [] as Statement[];

    constructor(element: ElementInline){
        super(element);
    }

    Statement(item: Statement){

    }

    Content(item: Element){
        this.items.add(item);
    }

    Props(item: Prop | SpreadItem){
        debugger
        this.props.add(item);
    }

    Style(item: ExplicitStyle | SpreadItem){
        debugger
        this.style.add(item);
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
                // if(current !== props)
                //     current = new AttributeStack(props);
                if(current !== props)
                    S.push(props = current as any);
            }

            else
            if(type == "style" || item instanceof ExplicitStyle){
                // if(current !== style)
                //     current = new AttributeStack(style);
                if(current !== style)
                    S.push(style = current as any);
            }

            if(current instanceof AttributeStack)
                current.push(item);
        } 
    }
    
    return S;
}
