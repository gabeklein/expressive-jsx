export default function babel_plugin_inferred_react_component(){
    return {
        visitor: {
            Program: {
                enter(path, state){

                    const {scope}  = path;
                    const {file} = this;

                    const _component = scope.generateUidIdentifier("_component");

                    Object.defineProperties(state, {
                        ref_component: {
                            get: componentWasInfered,
                            configurable: true
                        }
                    })

                    function componentWasInfered() {
                        state.extention_used = true;
                        Object.defineProperty(state, "ref_component", { value: _component })
                        return _component
                    }
                },
                exit(path, state){
                    const { file } = this;
                    const {scope}  = path;

                    if(state.extention_used){
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

                        path.scope.push({ 
                            kind: "const", 
                            id: state.ref_component,
                            init: t.memberExpression(_react, t.identifier("Component"))
                        })
                    }
                }
            },
            Class: {
                enter: classMayBeComponent
            }
        }
    }
}

const t = require("babel-types");

function classMayBeComponent(path, state){
    let classIsConsideredComponent = false;

    for(const property of path.get("body.body")){
        if( property.isClassMethod() ){
            switch(property.get("key.name").node){
                case "render":
                    classIsConsideredComponent = true;
                case "do":
                    if(this.opts.activeOnMethodDo != false)
                        classIsConsideredComponent = true;
            }
        }
    }

    if(classIsConsideredComponent){
        const alreadyExtends = path.get("superClass");
        if(alreadyExtends.isNullLiteral())
            path.node.superClass = null;
        else if(alreadyExtends.node == null)
            path.node.superClass = state.ref_component
    }
}