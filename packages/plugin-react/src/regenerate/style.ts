import t, { ArrayExpression, ObjectExpression, ObjectProperty, Statement } from '@babel/types';
import { PropertyES } from 'internal';
import { BunchOf } from 'types';

import { Module } from './module';

const RUNTIME = "@expressive/react";

type SelectorContent = ObjectProperty[];
type MediaGroups = SelectorContent[];

export function writeProvideStyleStatement(
    this: Module
){
    const {
        path: program,
        styleBlocks: style,
        lastInsertedElement
    } = this;

    const programBody = program.node.body;

    // this.imports.ensureImported(RUNTIME, )

    const polyfillModule = this.imports.ensure(RUNTIME, "Module")
    const output = [];

    const media = <BunchOf<MediaGroups>> {
        default: [] 
    };

    for(const block of style){
        const { priority = 0, query, selector } = block;

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

        const styleString = 
            block.map(style => {
                let styleKey = style.name;
                if(typeof styleKey == "string")
                    styleKey = styleKey.replace(/([A-Z]+)/g, "-$1").toLowerCase();
                return `${styleKey}: ${style.value}`
            }).join("; ")
        
        targetPriority.push(
            PropertyES("." + selector, t.stringLiteral(styleString))
        )
    }

    for(const query in media){
        const priorityBunches = media[query].map(x => t.objectExpression(x));
        output.push(
            PropertyES(query, t.arrayExpression(priorityBunches))
        )
    }

    let computed;

    if (output.length > 1)
        computed = t.objectExpression(output)
    else {
        computed = output[0].value as ArrayExpression
        if(computed.elements.length == 1)
            computed = computed.elements[0] as ObjectExpression;
    }

    const provideStatement = 
        t.expressionStatement(
            t.callExpression(
                t.memberExpression(polyfillModule, t.identifier("doesProvideStyle")), 
                [ computed ]
            )
        )

    const provideStatementGoesAfter = lastInsertedElement!.getAncestry().reverse()[1];
    const index = programBody.indexOf(provideStatementGoesAfter.node as Statement);
    
    programBody.splice(index + 1, 0, provideStatement)
}