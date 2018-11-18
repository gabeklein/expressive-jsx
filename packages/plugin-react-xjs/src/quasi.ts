import * as t from "@babel/types";
import { TemplateLiteral, TemplateElement, Expression } from '@babel/types';
import { transform, Opts } from "./shared";
import { NodePath as Path } from '@babel/traverse';
import { ElementInline } from './inline';
import { NonComponent } from './item';

export class QuasiComponent extends NonComponent {
    static applyTo(parent: ElementInline, path: Path<TemplateLiteral>){
        const { name } = parent.tags[0]; 
        const self = new this(path, name);
        parent.add(self);
    }

    constructor(path: Path<TemplateLiteral>, name: string ){
        super(path);

        const string_only = 
            // Opts.reactEnv == "native" || 
            // this.parent.typeInformation.type.type != "StringLiteral";
            /^[A-Z]/.test(name) && name !== "Text";

        (this as any).node = breakdown(this.node as any, string_only);
    }
}

function breakdown(quasi: TemplateLiteral, string_only?: boolean){
    const { quasis, expressions } = quasi;

    if( Opts.output == "JSX" && 
        quasis.find(
            element => /[{}]/.exec(element.value.raw) !== null )
    )   
        return quasi;

    if(expressions.length == 0)
        return t.stringLiteral(quasis[0].value.raw)

    const starting_indentation = /^\n( *)/.exec(quasis[0].value.cooked);
    const INDENT = starting_indentation && new RegExp("\n" + starting_indentation[1], "g");

    const items = [] as any[];

    const HANDLE_LINEBREAKS = 
        string_only ?
            breakForString :
        Opts.reactEnv == "native" ?
            breakForNative :
            breakWithBR;

    for(let i=0; i < quasis.length; i++)
        HANDLE_LINEBREAKS(quasis[i], expressions[i], items, INDENT, i, quasis.length);

    if(string_only)
        return quasi;
    else {
        if(INDENT) items.shift();
        return items.map(x => x.node)
    }
}

function breakForString(
    quasi: TemplateElement,
    then: Expression,
    items: any[],
    INDENT: RegExp | null, 
    i: number, 
    length: number
){
    for(let x of ["raw", "cooked"]){
        let text = quasi.value[x];
        if(INDENT) text = text.replace(INDENT, "\n");
        if(i == 0) text = text.replace("\n", "")
        if(i == length - 1)
            text = text.replace(/\s+$/, "")
        quasi.value[x] = text
    }
}

function breakForNative(
    quasi: TemplateElement,
    then: Expression,
    items: any[],
    INDENT: RegExp | null
){
    let text = quasi.value.cooked;
    if(INDENT) 
        text = text.replace(INDENT, "\n");
    const lines = text.split(/(?=\n)/g);

    for(let line, j=0; line = lines[j]; j++)
        if(line[0] == "\n"){
            if(lines[j+1] || then){
                items.push(
                    new NonComponent(
                        t.stringLiteral("\n")))
                items.push(
                    new NonComponent(
                        t.stringLiteral(
                            line.substring(1))))
            }
        }
        else items.push(
            new NonComponent(
                t.stringLiteral( line )))
    
    if(then) items.push(new NonComponent(then));
}

function breakWithBR(
    quasi: TemplateElement,
    then: Expression,
    items: any[],
    INDENT: RegExp | null,
    i: number
){
    const ELEMENT_BR = transform.createElement("br");
    let text = quasi.value.cooked;
    if(INDENT) 
        text = text.replace(INDENT, "\n");
    const lines = text.split(/(?=\n)/g);

    for(let line, j=0; line = lines[j]; j++)
        if(line[0] == "\n"){
            if(lines[j+1] || then){
                items.push({node: ELEMENT_BR})
                items.push(
                    new NonComponent(
                        t.stringLiteral(
                            line.substring(1))))
            }
        }
        else items.push(
            new NonComponent(
                t.stringLiteral( line )))
    
    if(then) items.push(new NonComponent(then));
}