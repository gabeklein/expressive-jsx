
import syntaxDoExpressions from "babel-plugin-syntax-do-expressions";

const t = require("babel-types");
const { ComponentExpression } = require('./doExpression.js');
const { DoMethodsAsRender } = require('./method.js');

const THIS_PROPS = 
    t.memberExpression(
        t.thisExpression(),
        t.identifier("props")
    )

export default () => ({
    inherits: syntaxDoExpressions,
    visitor: {
        Program: {
            enter(path, state){
                const {scope}  = path;

                const identifiers = state.expressive_init = {};

                const createElement = scope.generateUidIdentifier("create");
                const createClass = scope.generateUidIdentifier("class");
                
                Object.defineProperties(identifiers, {
                    createElement: {
                        get: expressiveWasUsed,
                        configurable: true
                    },
                    createClass: {
                        value: createClass
                    }
                })

                function expressiveWasUsed(){
                    state.expressive_used = true;
                    Object.defineProperty(identifiers, "createElement", { value: createElement })
                    return createElement;
                }
                
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
                    const imports = ["createElement"].map(
                        p => {
                            scope.push({
                                kind: "const",
                                id: init[p],
                                init: t.memberExpression(_react, t.identifier(p))
                            })
                        }
                    )
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
            enter(path){
                const doFunctions = [];

                for(let item of path.get("body.body"))
                    if( item.isClassMethod() && item.get("key").isIdentifier({name: "do"}) ){
                        doFunctions.push(item)
                        // item.remove()
                    }
                if(doFunctions.length) DoMethodsAsRender(doFunctions, state, path)
            }
        },
        DoExpression: {
            enter(path, state){

                let { node } = path,
                    { meta } = node;

                if(node._visited) return

                if(!meta)
                    meta = new ComponentExpression(path, state);

                meta.didEnterOwnScope(path, state, this)

                node._visited = true;
            },

            exit(path, state){
                path.node.meta.didExitOwnScope(path, state, this)
            }
        }
    }
})