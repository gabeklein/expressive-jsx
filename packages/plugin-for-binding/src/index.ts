import {
  isObjectPattern,
  isArrayPattern,
  memberExpression,
  callExpression,
  variableDeclaration,
  identifier,
  variableDeclarator,
  numericLiteral,
  forOfStatement,
  blockStatement,
  stringLiteral,
  arrayExpression,
  regExpLiteral,
  forStatement,
  binaryExpression,
  updateExpression,
  forInStatement
} from '@babel/types';

export default () => ({
    visitor: {
        ForInStatement: {
            enter: ForInStatement
        },
        ForOfStatement: {
            enter: ForOfStatement
        }
    }
})

function ForOfStatement(path){

    if(path.node.expressive_binds)
        return

    const { node } = path;

    let {
        source,
        bindings,
        kind = "const",
    } = parseBindings(path);
    
    let _objectIterated = source.node,
        _itemReference,
        _itemKey,
        _itemDestructure;

    switch(bindings.length){
        case 3:
            [_itemDestructure, _itemReference, _itemKey] = bindings;
            break;
        default:
            // console.log(bindings[0].type)
            [_itemReference, _itemKey] = bindings
    }
    
    switch(_objectIterated.type){
        case "StringLiteral":
            _objectIterated = 
                arrayExpression(
                    _objectIterated.value
                        .split(/, +/)
                        .map(e => stringLiteral(e))
                )
        break;

        case "TemplateLiteral": 
            _objectIterated = callExpression(
                memberExpression(
                    _objectIterated,
                    identifier("split")
                ),
                [regExpLiteral(", +")]
            )
        break;

        case "UnaryExpression":
        case "NumericLiteral": {
            const { argument, value } = _objectIterated;
            if(argument)
                _objectIterated = argument
            else if(!Number.isInteger(value)) 
                bind.source.buildCodeFrameError("For range must be an integer")
            
            _objectIterated = callExpression(
                memberExpression(
                    callExpression(
                        identifier("Array"), [_objectIterated]
                    ),
                    identifier("keys")
                ), []
            )
        } break;
        
    }

    let output;
    const stats = extractStatements(path.get("body"))
    
    if(!_itemKey){
        output = forOfStatement(
            variableDeclaration(kind, [
                variableDeclarator(_itemReference)
            ]),
            _objectIterated,
            blockStatement(stats)
        )
    }
    else {
        const init = [
            variableDeclarator(_itemKey, numericLiteral(0))
        ]
        if(_objectIterated.type != "Identifier"){
            const _source = _objectIterated;
            _objectIterated = path.scope.generateUidIdentifier("obj")
            init.push(
                variableDeclarator(_objectIterated, _source)
            )
        }
        output = forStatement(
            variableDeclaration("let", init),
            binaryExpression("<", _itemKey, memberExpression(_objectIterated, identifier("length"))),
            updateExpression("++", _itemKey),
            blockStatement(stats)
        )

        const bind = [
            variableDeclarator(
                _itemReference,
                memberExpression(
                    _objectIterated,
                    _itemKey,
                    true
                )
            )
        ];
        if(_itemDestructure) 
            bind.push(
                variableDeclarator(
                    _itemDestructure, 
                    _itemReference
                )
            )
        stats.unshift(
            variableDeclaration(kind, bind),
        )
    }

    output.expressive_binds = bindings;
    if(path.node.expressive_setKey){
        path.node.expressive_setKey(_itemKey || 
            callExpression(
                memberExpression(_itemReference, identifier("toString")), []
            )
        )
    }

    path.replaceWith(output)

}

function ForInStatement(path){

    if(path.node.expressive_binds) return;

    const bind = parseBindings(path)
    const { 
        source: {node: _source},
        bindings,
        kind = "const"
    } = bind;

    if(~["StringLiteral", "TemplateLiteral"].indexOf(_source.type)){
        throw path.get("right").buildCodeFrameError("A string here will cause runtime errors. Did you mean to use `for of` instead?")
    }

    const initial_bindings = []

    let _key, _value, _struct;

    switch(bindings.length) {
        case 3: 
            [_struct, _value, _key] = bindings;
            break;
        case 2:
            [_value, _key] = bindings;
            break;
        case 1:
            [_key] = bindings;
            if(isObjectPattern(_key) || isArrayPattern(_key)){
                _struct = _key;
                _key = path.scope.generateUidIdentifier("_key");
            }
            break;
    }
    
    const stats = extractStatements(path.get("body"))
    
    let _sourceReference = _source.type == "ObjectExpression" && _value
        ? path.scope.generateUidIdentifier("_object")
        : _source;

    if(_value || _struct){
        const initial_bindings = []
        
        if(!_value){
            initial_bindings.push(
                variableDeclarator(
                    _struct,
                    memberExpression(_sourceReference, _key, true)
                )
            )
        } else {
            initial_bindings.push(
                variableDeclarator(
                    _value,
                    memberExpression(_sourceReference, _key, true)    
                )
            )
            if(_struct) 
                initial_bindings.push(
                    variableDeclarator(
                        _struct, 
                        _value
                    )
                )
        }
        
        stats.unshift(
             variableDeclaration(kind, initial_bindings),
        )
    }

    const loop = forInStatement(
        variableDeclaration(kind, [
            variableDeclarator(_key)
        ]),
        _sourceReference,
        blockStatement(stats)
    )

    loop.expressive_binds = bind;
    if(path.node.expressive_setKey){
        path.node.expressive_setKey(_key)
    }

    if(_source !== _sourceReference)
        path.replaceWithMultiple([
            variableDeclaration("const", [
                variableDeclarator(_sourceReference, _source)
            ]),
            loop
        ])
    else 
        path.replaceWith(
            loop
        )
}

function extractStatements(body) {
    if(body.isBlockStatement())
        return body.node.body
    else
        return [ body.node ]
}

function parseBindings(path){

    let bindings = [];
    let kind;

    let iterable = path.get("right");

    if(iterable.isBinaryExpression({operator: "in"})){
        let extra = iterable.get("left");
        iterable = iterable.get("right");
        while(extra.isBinaryExpression({operator: "in"})){
            bindings.push(extra.get("right"))
            extra = extra.get("left");
        }
        bindings.push(extra);
    }

    let left = path.get("left")
    if(left.isVariableDeclaration()){
        kind = left.node.kind
        left = left.get("declarations.0.id")
    }

    bindings.push(left)
    bindings = bindings.reverse()

    if(bindings[2]){
        if(!bindings[0].isObjectPattern()){
            // debugger
            // throw bindings[0].buildCodeFrameError("Malformed arguments: expected ObjectPattern")
        }
        if(bindings[3])
            throw bindings[3].buildCodeFrameError("Malformed arguments: too many arguments!")
    }

    return {
        source: iterable,
        bindings: bindings.map(x => x.node),
        kind
    }

}