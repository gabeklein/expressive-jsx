
import syntaxDoExpressions from "babel-plugin-syntax-do-expressions";

const t = require("babel-types");
const { ComputeNewComponentExpression } = require('./doExpression.js');
const { DoMethodsAsRender } = require('./method.js');

export default () => ({
    inherits: syntaxDoExpressions,
    visitor: {
        Program: {
            enter(path, state){
                const {scope}  = path;

                const ids = state.expressive_init = {
                    createElement: "create",
                    createClass: "class",
                    createApplied: "apply",
                    Fragment: "fragment"
                };

                for(const x in ids)
                    ids[x] = scope.generateUidIdentifier(ids[x]);
            },
            exit(path, state){
                if(state.expressive_used){
                    const { file } = this;
                    const {scope}  = path;
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
                                    t.stringLiteral("react")
                                ]
                            )
                        })
                    }

                    const init = state.expressive_init;
                    const imports = ["createElement", "Fragment"].map(
                        p => {
                            scope.push({
                                kind: "const",
                                id: init[p],
                                init: t.memberExpression(_react, t.identifier(p))
                            })
                        }
                    )

                    const pass = t.identifier("from");

                    scope.push({
                        kind: "const",
                        id: init.createApplied,
                        init: t.arrowFunctionExpression(
                            [pass],
                            t.callExpression(
                                t.memberExpression(init.createElement, t.identifier("apply")),
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
                    if( item.isClassMethod() && item.get("key").isIdentifier({name: "do"}) ){
                        doFunctions.push(item)
                        // item.remove()
                    }
                if(doFunctions.length) {
                    DoMethodsAsRender(doFunctions, state, path)
                    state.expressive_used = true;
                }
            }
        },
        DoExpression: {
            enter(path, state){

                let { node } = path,
                    { meta } = node;

                if(node._visited) return

                if(!meta)
                    meta = ComputeNewComponentExpression(path, state);

                meta.didEnterOwnScope(path, state, this)

                node._visited = true;
                state.expressive_used = true;
            },

            exit(path, state){
                path.node.meta.didExitOwnScope(path, state, this)
            }
        }
    }
})