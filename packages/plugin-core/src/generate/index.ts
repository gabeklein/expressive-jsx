import { Expression, isExpression, Statement } from '@babel/types';
import { Attribute, ComponentFor, ComponentIf, ElementInline, ExplicitStyle, Prop } from 'handle';
import { SequenceItem } from 'types';

export abstract class ElementConstruct
    <From extends ElementInline = ElementInline> {

    abstract source: From;

    abstract Statement(item: Statement): void;
    abstract Content(item: Expression): void;
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
            if(item instanceof Attribute){
                if(this.Attribute && this.Attribute(item))
                    continue

                if(!overridden && item.overridden === true
                || !invariant && item.invariant === true)
                    continue;

                if(item instanceof Prop)
                    this.Props(item);
                else 
                if(item instanceof ExplicitStyle)
                    this.Style(item)
            }

            else {
                if(isExpression(item))
                    this.Content(item);
                else
                    this.Statement(item)
            }
        }

        if(this.didParse)
            this.didParse();
    }
}