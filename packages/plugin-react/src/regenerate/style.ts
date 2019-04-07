import { Path } from '@babel/traverse';
import t, { ArrayExpression, ObjectProperty, Program, ObjectExpression, Identifier, ImportSpecifier, Statement } from '@babel/types';
import { PropertyES } from 'internal';
import { BunchOf } from 'types';
import { ensureUIDIdentifier, findExistingImport } from 'helpers';
import { Module } from './module';

type SelectorContent = ObjectProperty[];
type MediaGroups = SelectorContent[];

const RUNTIME_PACKAGE = "@expressive/react";

export function writeProvideStyleStatement(
    Module: Module
){
    const {
        path: program,
        styleBlocks: style,
        lastInsertedElement: lastInsertedJSX
    } = Module;

    const programBody = program.node.body;
    const polyfillModule = importRuntimeModule(program);
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

    const provideStatementGoesAfter = lastInsertedJSX!.getAncestry().reverse()[1];
    const index = programBody.indexOf(provideStatementGoesAfter.node as Statement);
    
    programBody.splice(index + 1, 0, provideStatement)
}

function importRuntimeModule(program: Path<Program>): Identifier {
    const body = program.node.body;
    let runtimeImport = findExistingImport(body, RUNTIME_PACKAGE);

    if(!runtimeImport){
        const reactImport = findExistingImport(body, "react")!;
        const reactIndex = body.indexOf(reactImport);

        runtimeImport = t.importDeclaration([], t.stringLiteral(RUNTIME_PACKAGE))

        body.splice(reactIndex + 1, 0, runtimeImport)
    }

    for(const spec of runtimeImport.specifiers.slice(1)){
        const { imported, local } = spec as ImportSpecifier;
        if(imported.name == "Module")
            return local;
    }

    const local = ensureUIDIdentifier(program.scope, "Module");

    runtimeImport.specifiers.push(
        t.importSpecifier(
            local, t.identifier("Module")
        )
    )

    return local
}