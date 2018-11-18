require('source-map-support').install();

import * as t from "@babel/types";
import { Program, BlockStatement, Statement, ImportDeclaration, ModuleSpecifier, Identifier, StringLiteral, VariableDeclaration } from "@babel/types";
import { Shared, Opts, ensureUIDIdentifier, hoistLabeled } from "./shared";
import { ComponentClass, DoComponent } from './entry.js';
import { createSharedStack } from "./scope";
import { generateComputedStylesExport, generateComputedStyleSheetObject } from "./styles";
import { NodePath as Path } from "@babel/traverse";
import { ElementModifier } from "./modifier";
import * as TEMPLATE from "./support";

export default (options: any) => ({
    manipulateOptions: (_: any, parse: any) => {
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
} as {
    [handler: string]: string
}

class ExpressiveProgram {
    static enter(
        path: Path<Program>,
        state: any
    ){
        Object.assign(Opts, state.opts)

        if(Opts.reactEnv != "native")
            checkForStyleImport(path.get("body"));

        let Stack = Shared.stack = createSharedStack(state.opts.modifiers);

        const targets = state.expressive_computeTargets = [] as ElementModifier[];
        function capture(element: ElementModifier){
            targets.push(element);
        };
        Stack.program = { computedStyleMayInclude: capture };
            
        let helpers = Stack.helpers = {};
        state.didUse = {};

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

    static exit(
        path: Path<Program>,
        state: any, 
        options: any
    ){
        const { expressive_computeTargets: compute } = state;

        if(state.expressive_used){
            let index = 0;  //todo: remove
            
            index = includeImports(path, state);

            if(compute.length > 0)
                if(Opts.reactEnv == "native")
                    generateComputedStyleSheetObject(path, compute, index);
                else
                    generateComputedStylesExport(path, compute, index);

        }

        if(~process.execArgv.join().indexOf("inspect-brk"))
            console.log("done")
    }

    static onExit(options: any){
        return (path: Path<Program>, state: any) => this.exit(path, state, options)
    }
}

function checkForStyleImport(body: Path<Statement>[]){
    for(const statement of body)
        if(statement.isImportDeclaration()){
            const { source, specifiers } = statement.node;
            if(source.value == "@expressive/react")
            for(const {type, local} of specifiers)
                if(type == "ImportDefaultSpecifier")
                    Shared.styledApplicationComponentName = local.name
        }
}

function destructure(list: string[], shorthand: boolean){
    const destructure = [];
    const { helpers } = Shared.stack;

    for(const i of list)
        destructure.push(
            t.objectProperty(t.identifier(i), helpers[i], false, shorthand)
        )

    return destructure;
}

function requirement(from: string, imports: string[], shorthand = false){
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

function includeImports(path: Path<Program>, state: any) {

    const { didUse } = state;

    const bootstrap = [];
    const reactRequired = "react"
    const reactRequires = [];

    if(Opts.output !== "JSX")
        reactRequires.push("createElement")

    if(didUse.Fragment)
        reactRequires.push("Fragment")

    if(didUse.createClass)
        reactRequires.push("createClass");

    const { body } = path.scope.block as BlockStatement;
    const { helpers } = Shared.stack;

    let pasteAt = 0;

    function findExistingImport(MODULE: string, asRequire?: false): ImportDeclaration;
    function findExistingImport(MODULE: string, asRequire: true): VariableDeclaration;
    function findExistingImport(MODULE: string, asRequire?: boolean){
        return asRequire
            ? body.find(
                (statement: Statement, index: number) => {
                    if(statement.type == "VariableDeclaration")
                    for(const { init, id } of statement.declarations)
                    if(init && init.type == "CallExpression"){
                        const { name } = init.callee as Identifier;
                        let requirement = init.arguments[0] as StringLiteral;

                        if(name == "require"
                        && requirement && requirement.value == MODULE
                        && id.type == "ObjectPattern"){
                            pasteAt = index;
                            (statement as any).foundInitializer = id;
                            return true;
                        }
                    }
                    return false;
                }
            )
            : body.find(
                (statement: Statement, index: number) => {
                    if(statement.type == "ImportDeclaration" && statement.source.value == MODULE){
                        pasteAt = index
                        return true
                    }
                    return false;
                }
            )
    }

    if(Opts.output == "JSX"){
    // if(true){

        let existingReactImport = findExistingImport(reactRequired, false);
        let specifiers = existingReactImport ? existingReactImport.specifiers : [];

        if(existingReactImport){
            for(let name of reactRequires){
                const ident = helpers[name]; 
                if(!specifiers.find(
                    (spec: ModuleSpecifier) => 
                        spec.type == "ImportSpecifier" && spec.local.name == ident.name
                ))
                    specifiers.push(
                        t.importSpecifier(ident, ident)
                    )
            }
    
            if(Opts.output == "JSX")
                if(!specifiers.find(
                    (spec: ModuleSpecifier) => 
                        spec.type == "ImportDefaultSpecifier" && spec.local.name == "React"
                ))
                    specifiers.unshift(
                        t.importDefaultSpecifier(t.identifier("React"))
                    )
        }

        if(!existingReactImport)
            bootstrap.push(
                t.importDeclaration(specifiers, t.stringLiteral(reactRequired))
            )

    } else {
        // let existingReactImport = findExistingImport(reactRequired, true);
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
                    requirement(reactRequired, reactRequires)
                )
        // }
    }
    
    if(Opts.reactEnv == "native"){
        const nativeRequires = [];

        for(const spec of ["Text", "View", "StyleSheet"])
            if(didUse[spec]) nativeRequires.push(t.importSpecifier(helpers[spec], helpers[spec]))

        if(nativeRequires.length){
            let existingImport = findExistingImport("react-native");
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

        let existingImport = findExistingImport("@expressive/react");

        if(!Opts.formatStyles && Opts.reactEnv != "native")
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
        (TEMPLATE as any).createApplied({ NAME: helpers.createApplied })
    )

    if(didUse.extends && Opts.output !== "JSX")
    bootstrap.push(
        (TEMPLATE as any).fnExtends({ NAME: helpers.extends })
    )

    if(didUse.select)
    bootstrap.push(
        (TEMPLATE as any).fnSelect({ NAME: helpers.select })
    )

    if(state.expressive_for_used)
    bootstrap.push(
        (TEMPLATE as any).fnCreateIterated({ 
            NAME: helpers.createIterated,
            CREATE: helpers.createElement,
            FRAG: helpers.Fragment
        })
    );

    (path.scope.block as BlockStatement).body.splice(pasteAt + 1, 0, ...bootstrap)

    return pasteAt + bootstrap.length;
}