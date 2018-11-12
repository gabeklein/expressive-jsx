const t = require("@babel/types");
const { Shared, Opts } = require("./shared");

export function generateComputedStyleSheetObject(path, compute, index){
    const styles = [];
    const exists = {};
    const common = {};

    for(const mod of compute){
        const { styleID } = mod;
        const uID = styleID.name;
        let actual_name = uID.slice(0, uID.indexOf("_")).replace(/(^[A-Z])/, cap => cap.toLowerCase());

        if(common[uID]) {
            mod.styleID.name = common[uID];
            continue;
        }

        if(exists[actual_name])
            mod.styleID.name = actual_name + (++exists[actual_name]);
        else {
            mod.styleID.name = actual_name;
            exists[actual_name] = 1;
        }

        common[uID] = mod.styleID.name;

        styles.push(
            t.objectProperty(mod.styleID, mod.style_output)
        )
    }

    path.scope.block.body.push(
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

export function generateComputedStylesExport(path, compute, index){
    let styles = [];
    let media = {
        default: styles
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
                    media[query].filter(x => x).map(x => t.objectExpression(x))
                )
            )
        )
    }

    path.scope.block.body.splice(++index, 0, 
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