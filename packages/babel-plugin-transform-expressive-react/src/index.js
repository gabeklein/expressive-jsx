
import syntaxDoExpressions from "babel-plugin-syntax-do-expressions";

const t = require("babel-types");
const template = require("babel-template");
const { Shared, Opts } = require("./shared");
const { Component } = require("./component")
const { createSharedStack } = require("./modifier")
const { 
    RenderFromDoMethods, 
    ComponentInlineExpression, 
    ComponentFunctionExpression 
} = require('./entry.js');

const registerIDs = {
    createElement: "create",
    createClass: "class",
    createApplied: "apply",
    Fragment: "fragment",
    createIterated: "iterated",
    extends: "expressive_extends"
}

const fnCreateIterated = template(`
    (from, key) => (
        from.length 
            ? CREATE.apply(null, [FRAG, key ? {key} : {}].concat(from))
            : false
    )
`)

const fnBindMethods = template(`
    function expressive_methods(instance, methods: Array) {
        for(const name of methods){
            instance[name] = instance[name].bind(instance)
        }
    }
`)

const fnExtends = template(`
    (...args) => {
        for(const item of args){
            if(!item) throw new Error("Included properties object is undefined!")
        }
        return Object.assign.apply(null, [{}].concat(args));
    }
`)



export default (options) => {

    const REACT_MODULE_NAME = options.reactRequires || "react";

    Opts.ignoreExtraSemicolons = true;
    Opts.default_type_text = t.identifier("span")

    return {
        inherits: syntaxDoExpressions,
        visitor: {
            DoExpression: {
                enter: Component.enter,
                exit: Component.exit
            },
            Program: {
                enter(path, state){
                    Object.assign(Opts, state.opts)
                    Shared.state = state;
                    Shared.stack = createSharedStack(state.opts.modifiers);

                    for(const x in registerIDs)
                        Shared[x] = path.scope.generateUidIdentifier(registerIDs[x]);
                },
                exit(path, state){
                    if(~process.execArgv.join().indexOf("inspect-brk"))
                        console.log("done")

                    if(!state.expressive_used) return;

                    const { file } = this;
                    const { scope }  = path;
                    let _react = file.expressive_ref_react;

                    if(!_react){
                        _react 
                            = file.expressive_ref_react 
                            = scope.generateUidIdentifier("react");
                        scope.push({
                            kind: "const",
                            id: _react,
                            init: t.callExpression(
                                t.identifier("require"), [
                                    t.stringLiteral(REACT_MODULE_NAME)
                                ]
                            )
                        })
                    }

                    const imports = ["createElement", "Fragment"].map(
                        function(p){
                            scope.push({
                                kind: "const",
                                id: Shared[p],
                                init: t.memberExpression(_react, t.identifier(p))
                            })
                        }
                    )

                    {
                        const pass = t.identifier("from");
                        scope.push({
                            kind: "const",
                            id: Shared.createApplied,
                            init: t.arrowFunctionExpression(
                                [pass],
                                t.callExpression(
                                    t.memberExpression(Shared.createElement, t.identifier("apply")),
                                    [ t.identifier("undefined"), pass ]
                                )
                            )
                        })
                    }

                    {
                        const fn = fnExtends({});
                        scope.push({
                            kind: "const",
                            id: Shared.extends,
                            init: fn.expression
                        })
                    }

                    if(state.expressive_for_used){
                        const fn = fnCreateIterated({ 
                            CREATE: Shared.createElement,
                            FRAG: Shared.Fragment
                        });
                        scope.push({
                            kind: "const",
                            id: Shared.createIterated,
                            init: fn.expression
                        })
                    }
                }
            },
            Class: {
                enter(path, state){
                    const doFunctions = [];
                    const subComponents = [];

                    for(let item of path.get("body.body"))
                        if(item.isClassMethod({kind: "method"}) && item.get("key").isIdentifier()){
                            const { name } = item.node.key;
                            if(name == "do" || path.node.id && name == path.node.id.name)
                                doFunctions.push(item)
                            else if(/^[A-Z]/.test(name))
                                subComponents.push(item)
                        }
                        
                    if(doFunctions.length) {
                        RenderFromDoMethods(doFunctions, subComponents)
                        state.expressive_used = true;
                    }
                }
            }
        }
    }
}