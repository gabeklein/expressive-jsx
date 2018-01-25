
import syntaxDoExpressions from "babel-plugin-syntax-do-expressions";

const t = require("babel-types");
const { ComponentExpression } = require('./component.js');
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
            exit(){
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
                if(doFunctions.length) DoMethodsAsRender(doFunctions, path)
            }
        },
        DoExpression: {
            enter(path){
                let { node } = path,
                    { meta } = node;

                if(node._visited) return

                if(!meta)
                    meta = new ComponentExpression(path);

                meta.didEnterOwnScope(path, this.opts)

                node._visited = true;
            },

            exit(path){
                path.node.meta.didExitOwnScope(path, this.opts)
            }
        }
    }
})