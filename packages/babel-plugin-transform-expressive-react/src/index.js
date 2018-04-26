
import syntaxDoExpressions from "babel-plugin-syntax-do-expressions";

const t = require("babel-types");
const template = require("babel-template");
const { Shared, Opts } = require("./shared");
const { ComponentBody } = require("./component")
const { createSharedStack, StyleModifier, initComputedStyleAccumulator } = require("./modifier")
const { ComponentClass, ComponentInlineExpression, ComponentFunctionExpression } = require('./entry.js');

const registerIDs = {
    createElement: "create",
    createClass: "class",
    createApplied: "apply",
    Fragment: "fragment",
    createIterated: "iterated",
    extends: "flatten",
    cacheStyle: "Cache",
    claimStyle: "Enable"
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
            for(const item of arguments){
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
            for(const name of methods){
                instance[name] = instance[name].bind(instance)
            }
        }
    `)
}

function checkForStyleImport(body){
    for(const {type, source, specifiers} of body)
        if(type == "ImportDeclaration")
        if(source.value == "expressive-react-style")
        for(const {type, local} of specifiers)
            if(type == "ImportDefaultSpecifier")
                Shared.styledApplicationComponentName = local.name
}

export default (options) => {

    Opts.ignoreExtraSemicolons = true;
    Opts.default_type_text = t.identifier("span")

    return {
        inherits: syntaxDoExpressions,
        visitor: {
            DoExpression: {
                enter: ComponentBody.enter,
                exit: ComponentBody.exit
            },
            Program: {
                enter(path, state){
                    Object.assign(Opts, state.opts)

                    if(Opts.reactEnv == "next")
                        checkForStyleImport(path.scope.block.body);

                    for(const x in registerIDs)
                        Shared[x] = path.scope.generateUidIdentifier(registerIDs[x]);

                    let Stack = createSharedStack(state.opts.modifiers);
                        Stack = Shared.stack = initComputedStyleAccumulator(Stack, state);
                    Shared.state = state;

                },
                exit(path, state){

                    const { expressive_computeTargets: compute } = state;

                    if(state.expressive_used){
                        let index = 0;
                        index = includeImports(path, state, this.file, options);
                        index = generateComputedStylesExport(path, compute, index);
                    }

                    if(~process.execArgv.join().indexOf("inspect-brk"))
                        console.log("done")
                }
            },
            Class: {
                enter: ComponentClass.enter,
                exit: ComponentClass.exit
            }
        }
    }
}

function generateComputedStylesExport(path, compute, index){

    let styles = compute.filter(x => x.style_static.length)
    if(!styles.length) return index;
    
    const isIncluded = new Set();

    styles = styles
        .map(x => {
            const { classname } = x;
            if(!isIncluded.has(classname)){
                isIncluded.add(classname)
                return x.computeStyles()
            }
        })
        .filter(x => x);
    
    const css = `\n\t${ styles.join("\n\t") }\n`;

    path.scope.block.body.splice(++index, 0, 
        t.expressionStatement(
            t.callExpression(
                t.memberExpression(
                    Shared.cacheStyle, 
                    t.identifier("moduleDoesYieldStyle")
                ), [
                    t.stringLiteral(
                        path.hub.file.opts.filename
                    ),
                    t.templateLiteral([
                        t.templateElement({
                            cooked: css,
                            raw: css
                        }, true)
                    ], [])
                ]
            )
        )
    )

    return index;
}

function requirement(from, destructure){
    return t.variableDeclaration("const", [
        t.variableDeclarator(
            t.objectPattern(destructure), 
            t.callExpression(
                t.identifier("require"), [
                    t.stringLiteral(from)
                ]
            )
        )
    ])
}

function includeImports(path, state, file, { reactRequires = "react" }) {

    const bootstrap = [];

    const { body } = path.scope.block;

   const reactRequired = [
       t.objectProperty(t.identifier("createElement"), Shared.createElement),
       t.objectProperty(t.identifier("Fragment"), Shared.Fragment),
       t.objectProperty(t.identifier("createClass"), Shared.createClass)
   ]

    let pasteAt = 0;
    let existingImport = body.find(
        (statement, index) => {
            if(statement.type == "VariableDeclaration")
            for(let { init: { callee, arguments: args }, id } of statement.declarations)
            if(callee && callee.name == "require")
            if(args[0] && args[0].value == reactRequires)
            if(id.type == "ObjectPattern"){
                pasteAt = index;
                statement.reactInitializer = id.properties;
                return true;
            }
        }
    )

    if(existingImport)
        existingImport.reactInitializer.push(...reactRequired)
    else
        bootstrap.push(
            requirement(reactRequires, reactRequired)
        )

    const expressiveStyleRequired = [
        t.importSpecifier(Shared.cacheStyle, t.identifier("Cache")),
        t.importSpecifier(Shared.claimStyle, t.identifier("Enable"))
    ]

    existingImport = body.find(
        (statement, index) => {
            if(statement.type == "ImportDeclaration" && statement.source.value == "expressive-react-style"){
                pasteAt = index
                return true
            }
        }
    )

    if(Opts.formatStyles === undefined && Opts.reactEnv == "next")
    if(existingImport){
        existingImport.specifiers.push(...expressiveStyleRequired)
    }
    else 
    bootstrap.push(
        t.importDeclaration(expressiveStyleRequired, t.stringLiteral("expressive-react-style"))
    )

    bootstrap.push(
        TEMPLATE.createApplied({ NAME: Shared.createApplied })
    )

    bootstrap.push(
        TEMPLATE.fnExtends({ NAME: Shared.extends })
    )

    if(state.expressive_for_used)
    bootstrap.push(
        TEMPLATE.fnCreateIterated({ 
            NAME: Shared.createIterated,
            CREATE: Shared.createElement,
            FRAG: Shared.Fragment
        })
    )

    path.scope.block.body.splice(pasteAt + 1, 0, ...bootstrap)

    return pasteAt + bootstrap.length;
}