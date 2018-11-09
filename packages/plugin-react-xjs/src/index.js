const t = require("@babel/types");
const { Shared, Opts, ensureUIDIdentifier, hoistLabeled } = require("./shared");
const { ComponentClass, DoComponent } = require('./entry.js');
const { createSharedStack } = require("./scope");
const { generateComputedStylesExport, generateComputedStyleSheetObject } = require("./styles")
const TEMPLATE = require("./support");

export default (options) => ({
    manipulateOptions: (_, parse) => {
        parse.plugins.push("decorators-legacy", "doExpressions")
    },
    visitor: {
        Program: {
            enter: ExpressiveProgram.enter,
            exit: ExpressiveProgram.onExit(options)
        },
        Class: {
            enter: ComponentClass.enter,
            exit: ComponentClass.exit
        },
        DoExpression: {
            enter: DoComponent.enter,
            exit: DoComponent.exit
        }
    }
})

const registerIDs = {
    createElement: "create",
    createClass: "class",
    createApplied: "apply",
    Fragment: "Fragment",
    createIterated: "iterated",
    extends: "flatten",
    select: "resolve",
    cacheStyle: "Module",
    claimStyle: "Include",
    View: "View",
    Text: "Text",
    ModuleStyle: "style",
    StyleSheet: "StyleSheet"
}

class ExpressiveProgram {
    static enter(path, state){
        Object.assign(Opts, state.opts)

        if(Opts.reactEnv != "native")
            checkForStyleImport(path.scope.block.body);

        let Stack = createSharedStack(state.opts.modifiers);

        const targets = state.expressive_computeTargets = [];
        function capture(element){ targets.push.element };
        Stack.program = { computedStyleMayInclude: capture };
            
        let helpers = Stack.helpers = {};
        let didUse = state.didUse = {};

        for(const x in registerIDs){
            const named = registerIDs[x];
            const shouldUseExisting = ~["Text", "View"].indexOf(x);
            const reference = ensureUIDIdentifier.call(path.scope, named, shouldUseExisting, state.didUse);

            Object.defineProperty(helpers, x, {
                configurable: true,
                get(){
                    Object.defineProperty(helpers, x, { value: reference });
                    if(state.didUse[x] !== null) state.didUse[x] = true;
                    return reference;
                }
            })
        }

        hoistLabeled(path.node);

        Shared.state = state;
        
    }

    static exit(path, state, options){

        const { expressive_computeTargets: compute } = state;

        if(state.expressive_used){
            let index = 0;  //todo: remove
            
            index = includeImports(path, state, this.file, options);

            if(compute.length > 0)
                if(Opts.reactEnv == "native")
                    generateComputedStyleSheetObject(path, compute, index);
                else
                    generateComputedStylesExport(path, compute, index);

        }

        if(~process.execArgv.join().indexOf("inspect-brk"))
            console.log("done")
    }

    static onExit(options){
        return (path, state) => this.exit(path, state, options)
    }
}

function checkForStyleImport(body){
    for(const {type, source, specifiers} of body)
        if(type == "ImportDeclaration")
        if(source.value == "@expressive-react/style")
        for(const {type, local} of specifiers)
            if(type == "ImportDefaultSpecifier")
                Shared.styledApplicationComponentName = local.name
}

<<<<<<< HEAD:packages/plugin-react-xjs/src/index.js
function initComputedStyleAccumulator(Stack, build_state){
    const targets = build_state.expressive_computeTargets = [];
    const stack = Object.create(Stack);
    stack.program = { computedStyleMayInclude };

    function computedStyleMayInclude(element){
        targets.push(element)
        // let cd = targets;
        // let { stylePriority, path } = element;
        // path = [stylePriority, ...path];
        
        // for(let i = 0, p; p = path[i++];)
        //     if(cd[p]){
        //         if(typeof cd[p] == "string")
        //             cd = cd[p] = {"": cd[p]}
        //         else cd = cd[p];
        //     }
        //     else if(i === path.length) cd[p] = element.compiledStyle;
        //     else cd = cd[p] = {};
    }

    return stack;
}

function generateComputedStyleSheetObject(path, compute, index){
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

function generateComputedStylesExport(path, compute, index){
    let styles = [];
    let media = {
        default: styles
    };

    for(const x of compute){

        let { modifierQuery } = x.context;
        let into = styles;

        if(modifierQuery){
            modifierQuery = modifierQuery.queryString;
            into = media[modifierQuery] || (media[modifierQuery] = []);
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
=======
>>>>>>> master:packages/plugin-transform-xjs/src/index.js

function destructure(list, shorthand){
    const destructure = [];
    const { helpers } = Shared.stack;

    for(const i of list)
        destructure.push(
            t.objectProperty(t.identifier(i), helpers[i], false, shorthand)
        )

    return destructure;
}

function requirement(from, imports, shorthand){
    return t.variableDeclaration("const", [
        t.variableDeclarator(
            t.objectPattern(destructure(imports, shorthand)), 
            t.callExpression(
                t.identifier("require"), [
                    t.stringLiteral(from)
                ]
            )
        )
    ])
}

function includeImports(path, state, file) {

    const { didUse } = state;

    const bootstrap = [];
    const reactRequires = "react"
    const reactRequired = [];

    if(Opts.output !== "JSX")
        reactRequired.push("createElement")

    if(didUse.Fragment)
        reactRequired.push("Fragment")

    if(didUse.createClass)
        reactRequired.push("createClass");

    const { body } = path.scope.block;
    const { helpers } = Shared.stack;

    let pasteAt = 0;

    function findExistingFrom(MODULE, asRequire){
        return asRequire
            ? body.find(
                (statement, index) => {
                    if(statement.type == "VariableDeclaration")
                    for(const { init, id } of statement.declarations)
                    if(init){
                        let { callee, arguments: args } = init;
                        if(callee && callee.name == "require")
                        if(args[0] && args[0].value == MODULE)
                        if(id.type == "ObjectPattern"){
                            pasteAt = index;
                            statement.foundInitializer = id;
                            return true;
                        }
                    }
                }
            )
            : body.find(
                (statement, index) => {
                    if(statement.type == "ImportDeclaration" && statement.source.value == MODULE){
                        pasteAt = index
                        return true
                    }
                }
            )
    }

    if(Opts.output == "JSX"){
    // if(true){

        let existingReactImport = findExistingFrom(reactRequires, false);
        let specifiers = existingReactImport ? existingReactImport.specifiers : [];

        if(existingReactImport){
            for(let item of reactRequired){
                item = helpers[item]; 
                if(!specifiers.find(x => x.type == "ImportSpecifier" && x.local.name == item.name))
                specifiers.push(
                    t.importSpecifier(item, item)
                )
            }
    
            if(Opts.output == "JSX")
                if(!specifiers.find(x => x.type == "ImportDefaultSpecifier" && x.local.name == "React"))
                specifiers.unshift(
                    t.importDefaultSpecifier(t.identifier("React"))
                )
        }

        if(!existingReactImport)
            bootstrap.push(
                t.importDeclaration(specifiers, t.stringLiteral(reactRequires))
            )

    } else {
        let existingReactImport = findExistingFrom(reactRequires, true);
        // if(existingReactImport){
        //     if(false /*should output import statement*/){
        //         existingReactImport.specifiers.push(...reactRequired)
        //     } else {
        //         const { properties } = existingReactImport.foundInitializer;
        //         if(properties)
        //             properties.push(...destructure(reactRequired))
        //     }
        // }

        // else {
        //     if(false /*should output import statement*/){

        //     } else {
                // const { properties } = existingReactImport.foundInitializer;
                // if(properties)
                //     properties.push(...destructure(reactRequired))
            // }
                bootstrap.push(
                    requirement(reactRequires, reactRequired)
                )
        // }
    }
    
    if(Opts.reactEnv == "native"){
        const nativeRequires = [];

        for(const spec of ["Text", "View", "StyleSheet"])
            if(didUse[spec]) nativeRequires.push(t.importSpecifier(helpers[spec], helpers[spec]))

        if(nativeRequires.length){
            let existingImport = findExistingFrom("react-native")
            if(existingImport)
                existingImport.specifiers.push(
                    ...nativeRequires
                )
            else 
                bootstrap.push(
                    t.importDeclaration(nativeRequires, t.stringLiteral("react-native"))
                    // requirement("react-native", [
                    //     "View", "Text"
                    // ], true)
                )
        }
    }

    if(didUse.claimStyle){
        const expressiveStyleRequired = [
            t.importSpecifier(helpers.cacheStyle, t.identifier("Module")),
            t.importSpecifier(helpers.claimStyle, t.identifier("Include"))
        ]

        let existingImport = body.find(
            (statement, index) => {
                if(statement.type == "ImportDeclaration" && statement.source.value == "@expressive-react/style"){
                    pasteAt = index
                    return true
                }
            }
        )

        if(Opts.formatStyles === undefined && Opts.reactEnv != "native")
            if(existingImport){
                existingImport.specifiers.push(...expressiveStyleRequired)
            }
            else 
            bootstrap.push(
                t.importDeclaration(expressiveStyleRequired, t.stringLiteral("@expressive-react/style"))
            )
    }

    if(didUse.createApplied)
    bootstrap.push(
        TEMPLATE.createApplied({ NAME: helpers.createApplied })
    )

    if(didUse.extends && Opts.output !== "JSX")
    bootstrap.push(
        TEMPLATE.fnExtends({ NAME: helpers.extends })
    )

    if(didUse.select)
    bootstrap.push(
        TEMPLATE.fnSelect({ NAME: helpers.select })
    )

    if(state.expressive_for_used)
    bootstrap.push(
        TEMPLATE.fnCreateIterated({ 
            NAME: helpers.createIterated,
            CREATE: helpers.createElement,
            FRAG: helpers.Fragment
        })
    )

    path.scope.block.body.splice(pasteAt + 1, 0, ...bootstrap)

    return pasteAt + bootstrap.length;
}