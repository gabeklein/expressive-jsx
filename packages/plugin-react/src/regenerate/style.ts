import t, { Statement, identifier } from '@babel/types';
import { Modifier } from '@expressive/babel-plugin-core';
import { callExpression, memberExpression } from 'internal';
import { BunchOf } from 'types';

import { Module } from './module';

const RUNTIME = "@expressive/react";

type SelectorContent = [ string, string[] ][];
type MediaGroups = SelectorContent[];

export function writeProvideStyleStatement(
    this: Module,
    opts: any
){
    const media = orderSyntax(this.modifiersDeclared);
    const text = createSyntax(media, opts);
    writeSyntax(this, text, opts);
}

function orderSyntax(
    modifiersDeclared: Set<Modifier>
){
    const media: BunchOf<MediaGroups> = {
        default: [] 
    };

    for(let block of modifiersDeclared){
        const { priority = 0 } = block;

        let query = undefined;

        let targetQuery: MediaGroups =
            query === undefined ?
                media.default :
            query in media ?
                media[query] :
                media[query] = [];
        
        let targetPriority: SelectorContent = 
            priority in targetQuery ?
                targetQuery[priority] :
                targetQuery[priority] = [];

        const styles = 
            block.sequence.map(style => {
                let styleKey = style.name;
                if(typeof styleKey == "string")
                    styleKey = styleKey.replace(/([A-Z]+)/g, "-$1").toLowerCase();
                return `${styleKey}: ${style.value}`
            })

        let selection = "";
        do {
            let select = block.forSelector!.join("");
            if(selection)
                select += " " + selection;
            selection = select;
        }
        while(block = block.onlyWithin!);
        
        targetPriority.push([selection, styles])
    }

    return media;
}

function createSyntax(
    media: BunchOf<MediaGroups>,
    opts: any
){
    const lines = [];

    for(const query in media){
        const priorityBunches = media[query].filter(x => x);

        for(const bunch of priorityBunches)
            for(const [ name, styles ] of bunch){
                if(opts.printStyle == "pretty"){
                    let rules = styles.map(x => `\t${x};`);
                    lines.push(name + " { ", ...rules, " }")
                }
                else 
                    lines.push(`${name} { ${styles.join("; ")} }`)
            }
    }

    const content = lines.map(x => "\t" + x).join("\n")

    return `\n${content}\n`
}

function writeSyntax(
    module: Module,
    computedStyle: string,
    opts: any
){
    const {
        path: program,
        lastInsertedElement: pivot,
        imports
    } = module;

    const programBody = program.node.body;
    const polyfillModule = imports.ensure(RUNTIME, "default", "StyleSheet");

    const filenameMaybe = opts.hot !== false
        ? [ identifier("__filename") ] : [];

    const provideStatement = 
        t.expressionStatement(
            callExpression(
                memberExpression(polyfillModule, "shouldInclude"), 
                t.templateLiteral([
                    t.templateElement({raw: computedStyle, cooked: computedStyle}, true)
                ], []),
                ...filenameMaybe
            )
        )

    const provideStatementGoesAfter = pivot!.getAncestry().reverse()[1];
    const index = programBody.indexOf(provideStatementGoesAfter.node as Statement);
    
    programBody.splice(index + 1, 0, provideStatement)
}