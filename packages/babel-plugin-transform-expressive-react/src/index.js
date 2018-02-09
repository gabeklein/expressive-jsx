
import syntaxDoExpressions from "babel-plugin-syntax-do-expressions";

const t = require("babel-types");
const { Shared, Opts } = require("./shared");
const { 
    RenderFromDoMethods, 
    ComponentInlineExpression, 
    ComponentFunctionExpression 
} = require('./entry.js');

export default (options) => {

    Opts.ignoreExtraSemicolons = true;

    return {
        inherits: syntaxDoExpressions,
        visitor: {
            Program: {
                enter(path, state){
                    const ref = Shared.PROVIDED = {};

                    const ids = {
                        createElement: "create",
                        createClass: "class",
                        createApplied: "apply",
                        Fragment: "fragment"
                    };

                    for(const x in ids)
                        Shared[x] = path.scope.generateUidIdentifier(ids[x]);
                },
                exit(path, state){
                    const REACT_MODULE_NAME = options.reactRequires || "react";

                    if(state.expressive_used){
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
                            p => {
                                scope.push({
                                    kind: "const",
                                    id: Shared[p],
                                    init: t.memberExpression(_react, t.identifier(p))
                                })
                            }
                        )

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

                    if(process.execArgv.join().indexOf("inspect-brk") > -1)
                        console.log("done")
                }
            },
            LabeledStatement: {
                enter(path){
                    let { meta } = path.node;
                    if(meta) meta.didEnterOwnScope(path)
                },
                exit(path){
                    let { meta } = path.node;
                    if(meta) meta.didExitOwnScope(path)
                }
            },
            Class: {
                enter(path, state){
                    const doFunctions = [];

                    for(let item of path.get("body.body"))
                        if(item.isClassMethod({kind: "method"}) 
                        && item.get("key").isIdentifier({name: "do"}))
                            doFunctions.push(item)
                        
                    if(doFunctions.length) {
                        RenderFromDoMethods(doFunctions)
                        state.expressive_used = true;
                    }
                }
            },
            DoExpression: {
                enter(path, state){

                    let { node } = path,
                        { meta } = node;

                    if(node.expressive_visited) return

                    if(!meta){
                        meta = path.parentPath.isArrowFunctionExpression()
                            ? new ComponentFunctionExpression(path)
                            : new ComponentInlineExpression(path)
                    }

                    meta.didEnterOwnScope(path)

                    state.expressive_used = true;
                },

                exit(path){
                    const { node } = path;
                    if(node.expressive_visited) return
                    
                    node.meta.didExitOwnScope(path)
                    node.expressive_visited = true;
                }
            }
        }
    }
}