import { Expression, Statement } from '@babel/types';
import { NodePath as Path } from '@babel/traverse';
import {
    Attribute,
    ComponentIf,
    ElementInline,
    ExplicitStyle,
    Prop,
    SpreadItem,
    ComponentFor
} from 'internal';

type Attr = Prop | ExplicitStyle | SpreadItem;
export type Syntax = [ Expression, Statement[]?];
export type SequenceItem = Attr | InnerContent | Path<Statement>;
export type InnerContent = ElementInline | ComponentIf | ComponentFor | Path<Expression>;
// type FlatValue = string | number | boolean | null; 

export abstract class ElementConstruct
    <From extends ElementInline = ElementInline> {

    abstract source: From;

    abstract Statement<T extends Statement = never>(item: Path<T> | T): void;
    abstract Content<T extends Expression = never>(item: Path<T> | T): void;
    abstract Child<T extends Expression = never>(item: ElementInline): void
    abstract Props(prop: Prop | SpreadItem, overridden?: true): void;
    abstract Style(style: ExplicitStyle | SpreadItem, overridden?: true): void;
    abstract Switch(item: ComponentIf): void;
    abstract Iterate(item: ComponentFor): void;

    willParse?(): void;
    didParse?(): void;

    parse(overridden?: true){
        if(this.willParse)
            this.willParse();

        for(const item of this.source.sequence as SequenceItem[]){
            if(item instanceof ComponentIf)
                this.Switch(item)
            
            else if(item instanceof ComponentFor)
                this.Iterate(item)
            
            else 
            if(item instanceof ElementInline)
                this.Child(item);
                
            else 
            if(item instanceof Attribute) {
                if(!overridden && item.overriden == true)
                    continue;

                const handler = item.type == "props" 
                    ? "Props" : "Style"

                this[handler](item, overridden);
            }

            else {
                const handler = item.type == "Expression"
                    ? "Content"
                    : "Statement";

                this[handler](item as Path<any>)
            }
        }

        if(this.didParse)
            this.didParse();
    }
}