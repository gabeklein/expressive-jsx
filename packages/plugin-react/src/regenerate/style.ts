import t, { ArrayExpression, ObjectExpression, ObjectProperty, Statement } from '@babel/types';
import { PropertyES, memberExpression, callExpression } from 'internal';
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
        lastInsertedElement,
        modifiersDeclared
    } = this;

    void modifiersDeclared;

    const programBody = program.node.body;

    const polyfillModule = this.imports.ensure(RUNTIME, "Module")
    const output = [];

    const media = <BunchOf<MediaGroups>> {
        default: [] 
    };

    for(const block of modifiersDeclared){
        const { priority = 0 } = block;

        let query = undefined;
        let selectors = block.forSelector!

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
            block.sequence.map(style => {
                let styleKey = style.name;
                if(typeof styleKey == "string")
                    styleKey = styleKey.replace(/([A-Z]+)/g, "-$1").toLowerCase();
                return `${styleKey}: ${style.value}`
            }).join("; ")
        
        targetPriority.push(
            PropertyES(selectors.join(""), t.stringLiteral(styleString))
        )
    }

    for(const query in media){
        const priorityBunches = media[query].map(x => t.objectExpression(x)).filter(x => x);
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
            callExpression(
                memberExpression(polyfillModule, "doesProvideStyle"), 
                computed 
            )
        )

    const provideStatementGoesAfter = lastInsertedElement!.getAncestry().reverse()[1];
    const index = programBody.indexOf(provideStatementGoesAfter.node as Statement);
    
    programBody.splice(index + 1, 0, provideStatement)
}