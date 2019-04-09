import t, { Expression, Statement } from '@babel/types';
import { NodePath as Path } from '@babel/traverse';
import {
    Attribute,
    ComponentIf,
    ElementInline,
    ExplicitStyle,
    Prop,
    ComponentFor
} from 'internal';

export type Syntax = [ Expression, Statement[]?];
export type SequenceItem = Attribute | InnerContent | Path<Statement>;
export type InnerContent = ElementInline | ComponentIf | ComponentFor | Path<Expression> | Expression;
// type FlatValue = string | number | boolean | null; 

export abstract class ElementConstruct
    <From extends ElementInline = ElementInline> {

    abstract source: From;

    abstract Statement<T extends Statement = never>(item: Path<T> | T): void;
    abstract Content<T extends Expression = never>(item: Path<T> | T): void;
    abstract Child(item: ElementInline): void
    abstract Props(prop: Prop): void;
    abstract Style(style: ExplicitStyle): void;
    abstract Switch(item: ComponentIf): void;
    abstract Iterate(item: ComponentFor): void;

    Attribute?(item: Attribute): boolean | undefined | Statement;

    willParse?(sequence: SequenceItem[]): SequenceItem[] | undefined;
    didParse?(): void;

    parse(invariant: true, overridden: true){
        let { sequence } = this.source;

        if(this.willParse){
            const replace = this.willParse(sequence);
            if(replace && replace !== sequence) 
                sequence = replace;
        }

        for(const item of sequence as SequenceItem[]){
            if(item instanceof ComponentIf)
                this.Switch(item)
            
            else if(item instanceof ComponentFor)
                this.Iterate(item)
            
            else 
            if(item instanceof ElementInline)
                this.Child(item);
                
            else 
            if(item instanceof Attribute) {
                if(this.Attribute && this.Attribute(item))
                    continue

                if(!overridden && item.overriden === true
                || !invariant && item.invariant === true)
                    continue;

                if(item instanceof Prop)
                    this.Props(item);
                else 
                if(item instanceof ExplicitStyle)
                    this.Style(item)
            }

            else {
                const node = "node" in item ? item.node : item;

                if(t.isExpression(node))
                    this.Content(item as Path<Expression>);
                else
                    this.Statement(item as Path<Statement>)
            }
        }

        if(this.didParse)
            this.didParse();
    }
}