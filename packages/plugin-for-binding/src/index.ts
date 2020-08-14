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
    kind = "const"
  } = parseBindings(path);
  
  let objectIterated = source.node
  let itemReference;
  let itemKey;
  let itemDestructure;

  switch(bindings.length){
    case 3:
      [itemDestructure, itemReference, itemKey] = bindings;
      break;
    default:
      // console.log(bindings[0].type)
      [itemReference, itemKey] = bindings
  }
  
  switch(objectIterated.type){
    case "StringLiteral":
      objectIterated = 
        arrayExpression(
          objectIterated.value
            .split(/, +/)
            .map(e => stringLiteral(e))
        )
    break;

    case "TemplateLiteral": 
      objectIterated = callExpression(
        memberExpression(
          objectIterated,
          identifier("split")
        ),
        [regExpLiteral(", +")]
      )
    break;

    case "UnaryExpression":
    case "NumericLiteral": {
      const { argument, value } = objectIterated;
      if(argument)
        objectIterated = argument
      else if(!Number.isInteger(value)) 
        bind.source.buildCodeFrameError("For range must be an integer")
      
      objectIterated = callExpression(
        memberExpression(
          callExpression(
            identifier("Array"), [objectIterated]
          ),
          identifier("keys")
        ), []
      )
    } break;
    
  }

  let output;
  const stats = extractStatements(path.get("body"))
  
  if(!itemKey){
    output = forOfStatement(
      variableDeclaration(kind, [
        variableDeclarator(itemReference)
      ]),
      objectIterated,
      blockStatement(stats)
    )
  }
  else {
    const init = [
      variableDeclarator(itemKey, numericLiteral(0))
    ]
    if(objectIterated.type != "Identifier"){
      const source = objectIterated;
      objectIterated = path.scope.generateUidIdentifier("obj")
      init.push(
        variableDeclarator(objectIterated, source)
      )
    }
    output = forStatement(
      variableDeclaration("let", init),
      binaryExpression("<", itemKey, memberExpression(objectIterated, identifier("length"))),
      updateExpression("++", itemKey),
      blockStatement(stats)
    )

    const bind = [
      variableDeclarator(
        itemReference,
        memberExpression(
          objectIterated,
          itemKey,
          true
        )
      )
    ];
    if(itemDestructure) 
      bind.push(
        variableDeclarator(
          itemDestructure, 
          itemReference
        )
      )
    stats.unshift(
      variableDeclaration(kind, bind),
    )
  }

  output.expressive_binds = bindings;
  if(path.node.expressive_setKey){
    path.node.expressive_setKey(itemKey || 
      callExpression(
        memberExpression(itemReference, identifier("toString")), []
      )
    )
  }

  path.replaceWith(output)

}

function ForInStatement(path){

  if(path.node.expressive_binds) return;

  const bind = parseBindings(path)
  const { 
    source: {node: source},
    bindings,
    kind = "const"
  } = bind;

  if(~["StringLiteral", "TemplateLiteral"].indexOf(source.type)){
    throw path.get("right").buildCodeFrameError("A string here will cause runtime errors. Did you mean to use `for of` instead?")
  }

  const initial_bindings = []

  let key;
  let value;
  let struct;

  switch(bindings.length) {
    case 3: 
      [struct, value, key] = bindings;
      break;
    case 2:
      [value, key] = bindings;
      break;
    case 1:
      [key] = bindings;
      if(isObjectPattern(key) || isArrayPattern(key)){
        struct = key;
        key = path.scope.generateUidIdentifier("key");
      }
      break;
  }
  
  const stats = extractStatements(path.get("body"))
  
  let sourceReference = source.type == "ObjectExpression" && value
    ? path.scope.generateUidIdentifier("object")
    : source;

  if(value || struct){
    const initial_bindings = []
    
    if(!value){
      initial_bindings.push(
        variableDeclarator(
          struct,
          memberExpression(sourceReference, key, true)
        )
      )
    } else {
      initial_bindings.push(
        variableDeclarator(
          value,
          memberExpression(sourceReference, key, true)    
        )
      )
      if(struct) 
        initial_bindings.push(
          variableDeclarator(
            struct, 
            value
          )
        )
    }
    
    stats.unshift(
       variableDeclaration(kind, initial_bindings),
    )
  }

  const loop = forInStatement(
    variableDeclaration(kind, [
      variableDeclarator(key)
    ]),
    sourceReference,
    blockStatement(stats)
  )

  loop.expressive_binds = bind;
  if(path.node.expressive_setKey){
    path.node.expressive_setKey(key)
  }

  if(source !== sourceReference)
    path.replaceWithMultiple([
      variableDeclaration("const", [
        variableDeclarator(sourceReference, source)
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