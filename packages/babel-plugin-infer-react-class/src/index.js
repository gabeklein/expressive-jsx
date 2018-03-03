export default function babel_plugin_inferred_react_component(){
    return {
        visitor: {
            Program: {
                enter(path, state){
                    state.ref_component = path.scope.generateUidIdentifier("_component");
                },
                exit(path, state){
                    const { file } = this;
                    const { scope }  = path;

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
                enter(path, state){
                    if(isClassComponent(path, this.opts)){
                        state.extention_used = true;
                        polyfillComponent(path, state.ref_component)
                    }
                }
            }
        }
    }
}

const t = require("babel-types");

function isClassComponent(path, opts){
    const alreadyExtended = path.get("superClass");

    const hello = "hello"

    if(alreadyExtended.isNullLiteral()){
        path.node.superClass = null;
        return false;
    }
    return path.node.body.body.find(
        function(x){
            const {name} = x.key;
            return x.type == "ClassMethod" 
                && name == "render" 
                || opts.activeOnMethodDo != false  
                && name == "do"
                || name == path.node.id.name
        }
    )
}

function polyfillComponent(path, _component){
    path.node.superClass = _component;
    path.get("body.body").find(
        x => {
            const {type, key, params} = x.node;
            if(type == "ClassMethod")
            if(key.name == "constructor")
            try {
                const body = x.get("body.body");
                if(
                    !body.find(path => {
                        try {
                            return path.get("expression.callee").isSuper()
                        } catch(e) {
                            return false;
                        }
                    })
                ) {
                    let _props = params[0];
                    let _struct;
                    if(!_props || (_props.type == "ObjectPattern")){
                        _struct = _props
                        _props = params[0] = x.scope.generateUidIdentifier("props")
                    }

                    if(_struct)
                        x.scope.push({
                            type: "const",
                            id: _struct,
                            init: _props
                        })

                    body[0].insertBefore(
                        t.expressionStatement(
                            t.callExpression(
                                t.identifier("super"), [_props]
                            )
                        )
                    )
                }
            } catch(e) { return false }  
        }
    )    
}