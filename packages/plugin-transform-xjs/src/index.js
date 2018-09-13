
import syntaxDoExpressions from "babel-plugin-syntax-do-expressions";

const t = require("@babel/types");
const template = require("babel-template");
const { Shared, Opts } = require("./shared");
const { ComponentClass, DoComponent } = require('./entry.js');
const { createSharedStack } = require("./scope")

const read = Object.keys;
const only = (obj) => {
    const keys = read(obj);
    return keys.length === 1 && obj[keys[0]];
}

export default (options) => {
    return {
        inherits: syntaxDoExpressions,
        visitor: {
            DoExpression: {
                enter: DoComponent.enter,
                exit: DoComponent.exit
            },
            Program: {
                enter: ExpressiveProgram.enter,
                exit: ExpressiveProgram.onExit(options)
            },
            Class: {
                enter: ComponentClass.enter,
                exit: ComponentClass.exit
            }
        }
    }
}

const registerIDs = {
    createElement: "create",
    createClass: "class",
    createApplied: "apply",
    Fragment: "fragment",
    createIterated: "iterated",
    extends: "flatten",
    select: "resolve",
    cacheStyle: "Cache",
    claimStyle: "Include",
    View: "View",
    Text: "Text"
}

const TEMPLATE = {
    fnCreateIterated: template(`
        function NAME(from, key){
            return from.length 
                ? CREATE.apply(null, [FRAG, key ? {key} : {}].concat(from))
                : false
        }
    `),

    fnExtends: template(`
        function NAME(){
            for(var item of arguments){
                if(!item) throw new Error("Included properties object is undefined!")
            }
            return Object.assign.apply(null, [{}].concat(Array.from(arguments)));
        }
    `),

    createApplied: template(`
        function NAME(from){
            return _create.apply(undefined, from);
        }
    `),

    fnBindMethods: template(`
        function expressive_methods(instance, methods) {
            for(var name of methods){
                instance[name] = instance[name].bind(instance)
            }
        }
    `),

    fnSelect: template(`
        function NAME() {
            var output = "";
            for(var classname of arguments)
                if(typeof classname == "string")
                    output += " " + classname;
            return output.substring(1)
        }
    `)
}

class ExpressiveProgram {
    static enter(path, state){
        Object.assign(Opts, state.opts)

        if(Opts.reactEnv != "native")
            checkForStyleImport(path.scope.block.body);

        let Stack = createSharedStack(state.opts.modifiers);
            Stack = Shared.stack = initComputedStyleAccumulator(Stack, state);
            
        let Helpers = Stack.helpers = {};
        let didUse = state.didUse = {};

        for(const x in registerIDs){
            const reference = x == "View" || x == "Text"
                ? t.identifier(x)
                : path.scope.generateUidIdentifier(registerIDs[x]);
            Object.defineProperty(Helpers, x, {
                configurable: true,
                get(){
                    Object.defineProperty(Helpers, x, { value: reference });
                    state.didUse[x] = true;
                    return reference;
                }
            })
        }

        Shared.state = state;
    }

    static exit(path, state, options){

        const { expressive_computeTargets: compute } = state;

        if(state.expressive_used){
            let index = 0;

            index = includeImports(path, state, this.file, options);

            if(Opts.reactEnv != "native" && compute.length > 0)
                index = generateComputedStylesExport(path, compute, index);
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
                    t.identifier("moduleDoesYieldStyle")
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
    const reactRequired = [
        "createElement"
    ]

    if(didUse.Fragment)
        reactRequired.push("Fragment")

    if(didUse.createClass)
        reactRequired.push("createClass")

    const { body } = path.scope.block;

    let pasteAt = 0;
    let existingImport = body.find(
        (statement, index) => {
            if(statement.type == "VariableDeclaration")
            for(const { init, id } of statement.declarations)
            if(init){
                let { callee, arguments: args } = init;
                if(callee && callee.name == "require")
                if(args[0] && args[0].value == reactRequires)
                if(id.type == "ObjectPattern"){
                    pasteAt = index;
                    statement.reactInitializer = id.properties;
                    return true;
                }
            }
        }
    )

    if(existingImport)
        existingImport.reactInitializer.push(...destructure(reactRequired))
    else
        bootstrap.push(
            requirement(reactRequires, reactRequired)
        )

    if(Opts.reactEnv == "native")
        bootstrap.push(
            requirement("react-native", [
                "View", "Text"
            ], true)
        )

    const { helpers } = Shared.stack;

    if(didUse.claimStyle){
        const expressiveStyleRequired = [
            t.importSpecifier(helpers.cacheStyle, t.identifier("Cache")),
            t.importSpecifier(helpers.claimStyle, t.identifier("Include"))
        ]

        existingImport = body.find(
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

    if(didUse.extends)
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