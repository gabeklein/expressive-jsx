import { Expression, Statement } from '@babel/types';
import {
    Attribute,
    ComponentIf,
    ElementInline,
    ExplicitStyle,
    InnerStatement,
    NonComponent,
    Prop,
    SpreadItem,
    ComponentFor
} from 'internal';

export type Syntax = [ Expression, Statement[]?];
export type SequenceItem = Element | Prop | ExplicitStyle | SpreadItem | ComponentIf | ComponentFor;
export type Element = ElementInline | NonComponent<any>;
export type GenerateStatement = InnerStatement<any>;

export abstract class AssembleElement
    <From extends ElementInline = ElementInline> {

    abstract Statement(statement: GenerateStatement): void;
    abstract Content(child: Element): void;
    abstract Props(item: Prop | SpreadItem): void;
    abstract Style(item: ExplicitStyle | SpreadItem): void;
    abstract Switch(item: ComponentIf): void;
    abstract Iterate(item: ComponentFor): void;

    constructor(
        protected source: From, 
        protected expressionRequired = false){
    }

    parse(includeOverridden?: true){
        for(const item of this.source.sequence as SequenceItem[]){
            if(item instanceof ComponentIf)
                this.Switch(item)
            
            else if(item instanceof ComponentFor)
                this.Iterate(item)
            
            else 
            if(item instanceof ElementInline
            || item instanceof NonComponent)
                this.Content(item);
                
            else 
            if(item instanceof InnerStatement)
                this.Statement(item);
    
            else 
            if(item instanceof Attribute) {
                if(!includeOverridden && item.overriden == true)
                    continue;
    
                if(item instanceof Prop 
                || item.name == "props")
                    this.Props(item);

                else if(item instanceof ExplicitStyle 
                || item.name == "style")
                    this.Style(item);
            }
        }
    }
}