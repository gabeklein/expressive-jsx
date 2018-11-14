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

        let Stack = Shared.stack = createSharedStack(state.opts.modifiers);

        const targets = state.expressive_computeTargets = [];
        function capture(element){
            targets.push(element);
        };
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
        if(source.value == "@expressive/react")
        for(const {type, local} of specifiers)
            if(type == "ImportDefaultSpecifier")
                Shared.styledApplicationComponentName = local.name
}

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
                if(statement.type == "ImportDeclaration" && statement.source.value == "@expressive/react"){
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
                t.importDeclaration(expressiveStyleRequired, t.stringLiteral("@expressive/react"))
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