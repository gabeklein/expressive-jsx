import * as t from "@babel/types";
import { BlockStatement, Program } from "@babel/types";
import { NodePath as Path } from "@babel/traverse";
import { Shared } from "./shared";
import { ElementModifier } from "./modifier";

type ComputeTarget = ElementModifier;

export function generateComputedStyleSheetObject(
    path: Path<Program>,
    compute: ComputeTarget[],
    index: number ){

    const styles = [];
    const exists = {} as {
        [uID: string]: number;
    };;
    const common = {} as {
        [uID: string]: any
    };

    for(const mod of compute){
        const styleID = mod.styleID!;
        const style_output = mod.style_output!;
        const uID = styleID.name;
        let actual_name = uID.slice(0, uID.indexOf("_")).replace(/(^[A-Z])/, (cap: string) => cap.toLowerCase());

        if(common[uID]) {
            styleID.name = common[uID];
            continue;
        }

        if(exists[actual_name])
            styleID.name = actual_name + (++exists[actual_name]);
        else {
            styleID.name = actual_name;
            exists[actual_name] = 1;
        }

        common[uID] = styleID.name;

        styles.push(
            t.objectProperty(styleID, style_output)
        )
    }
    
    const { body } = path.scope.block as BlockStatement;
    
    body.push(
        t.variableDeclaration("const", [
            t.variableDeclarator(
                Shared.stack.helpers.ModuleStyle,
                t.callExpression(
                    t.memberExpression(
                        Shared.stack.helpers.StyleSheet,
                        t.identifier("create")
                    ), [
                        t.objectExpression(styles)
                    ]
                )
            )
        ])
    )
    return index;
}

export function generateComputedStylesExport(
    path: Path<Program>, 
    compute: ComputeTarget[], 
    index: number ){

    let styles = [] as any[];
    let media = {
        default: styles
    } as {
        [media: string]: any
    };

    for(const x of compute){

        let { modifierQuery } = x.context;
        let into = styles;

        if(modifierQuery){
            modifierQuery = modifierQuery.queryString;
            into = media[modifierQuery] || (media[modifierQuery] = [])
        }

        let y = into[x.stylePriority];
        if(!y) 
            y = into[x.stylePriority] = [];

        const cS = x.computeStyles();
        if(cS) y.push(cS)
    }

    const output = [];

    for(const query in media){
        output.push(
            t.objectProperty(
                t.stringLiteral(query),
                t.arrayExpression(
                    media[query]
                        .filter((x: any) => !!x)
                        .map((x: any[]) => t.objectExpression(x))
                )
            )
        )
    }

    const { body } = path.scope.block as BlockStatement;
    
    body.splice(++index, 0, 
        t.expressionStatement(
            t.callExpression(
                t.memberExpression(
                    Shared.stack.helpers.cacheStyle, 
                    t.identifier("doesProvideStyle")
                ), [
                    t.stringLiteral(
                        path.hub.file.opts.filename
                    ),
                    t.objectExpression(output)
                ]
            )
        )
    )

    return index;
}