import t, { TemplateElement, Expression, TemplateLiteral } from "@babel/types";

export function breakdown(quasi: TemplateLiteral, string_only?: boolean){
    const { quasis, expressions } = quasi;

    const iForgotWhatImTestingForHere = quasis.find(
        element => /[{}]/.test(element.value.raw)
    )

    if(iForgotWhatImTestingForHere)   
        return quasi;

    if(expressions.length == 0)
        return t.stringLiteral(quasis[0].value.raw)

    const starting_indentation = /^\n( *)/.exec(quasis[0].value.cooked);
    const INDENT = starting_indentation && new RegExp("\n" + starting_indentation[1], "g");

    const items = [] as any[];

    const HANDLE_LINEBREAKS = 
        string_only ?
            breakForString :
        false ?
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



export function breakForString(
    quasi: TemplateElement,
    then: Expression,
    items: any[],
    INDENT: RegExp | null, 
    i: number, 
    length: number ){

    for(let x of ["raw", "cooked"]){
        let text = quasi.value[x];
        if(INDENT) text = text.replace(INDENT, "\n");
        if(i == 0) text = text.replace("\n", "")
        if(i == length - 1)
            text = text.replace(/\s+$/, "")
        quasi.value[x] = text
    }
}

export function breakForNative(
    quasi: TemplateElement,
    then: Expression,
    items: any[],
    INDENT: RegExp | null ){

    let text = quasi.value.cooked;
    if(INDENT) 
        text = text.replace(INDENT, "\n");
    const lines = text.split(/(?=\n)/g);

    for(let line, j=0; line = lines[j]; j++)
        if(line[0] == "\n"){
            if(lines[j+1] || then){
                items.push(t.stringLiteral("\n"))
                items.push(
                    t.stringLiteral(line.substring(1))
                )
            }
        }
        else items.push(t.stringLiteral( line ))
    
    if(then) items.push(then);
}

export function breakWithBR(
    quasi: TemplateElement,
    then: Expression,
    items: any[],
    INDENT: RegExp | null,
    i: number ){

    throw new Error("not implemented")

    const ELEMENT_BR = null as any; // GenerateES.element("br");
    let text = quasi.value.cooked;
    if(INDENT) 
        text = text.replace(INDENT, "\n");
    const lines = text.split(/(?=\n)/g);

    for(let line, j=0; line = lines[j]; j++)
        if(line[0] == "\n"){
            if(lines[j+1] || then){
                items.push(ELEMENT_BR)
                items.push(
                    t.stringLiteral(
                        line.substring(1)
                    )
                )
            }
        }
        else items.push(
            t.stringLiteral( line ))
    
    if(then) items.push(then);
}
