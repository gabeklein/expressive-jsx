import * as t from '../types';

export function getName(path: t.NodePath): string {
  let encounteredReturn;

  while(path)
    switch(path.type){
      case "LabeledStatement":
        return (<t.LabeledStatement>path.node).label.name;

      case "VariableDeclarator": {
        const { id } = path.node as t.VariableDeclarator;
        return t.isIdentifier(id)
          ? id.name
          : (<t.VariableDeclaration>path.parentPath!.node).kind
      }

      case "AssignmentExpression":
      case "AssignmentPattern": {
        const { left } = path.node as t.AssignmentExpression;
        return t.isIdentifier(left) ? left.name : "assignment";
      }

      case "FunctionDeclaration":
        return (<t.FunctionDeclaration>path.node).id!.name;

      case "ExportDefaultDeclaration":
        return getLocalFilename(path.hub);

      case "ArrowFunctionExpression": {
        path = path.parentPath!;
        continue;
      }

      case "ReturnStatement": {
        if(encounteredReturn)
          return "return";

        encounteredReturn = path;

        const ancestry = path.getAncestry();
        const within = ancestry.find((x)=> x.isFunction()) as t.NodePath<t.Function>;

        const { node } = within;

        if("id" in node && node.id)
          return node.id.name;

        if(t.isObjectMethod(node)){
          path = within.getAncestry()[2];
          continue;
        }

        if(t.isClassMethod(node)){
          if(node.key.type !== "Identifier")
            return "ClassMethod";

          if(node.key.name != "render")
            return node.key.name;

          const owner = within.parentPath.parentPath as t.NodePath<t.Class>;

          if(owner.node.id)
            return owner.node.id.name;

          path = owner.parentPath;
          continue;
        }

        path = within.parentPath;
        continue;
      }

      case "ObjectProperty": {
        const { key } = path.node as t.ObjectProperty;
        return (
          t.isIdentifier(key) ? key.name : 
          t.isStringLiteral(key) ? key.value : 
          "property"
        )
      }

      default:
        return "element";
    }

  return "element";
}

export function getLocalFilename(hub: t.Hub){
  try {
    const { basename, dirname, sep: separator } = require('path');

    const url = (hub as any).file.opts.filename as string;
    const [ base ] = basename(url).split(".");
  
    if(base !== "index")
      return base;
  
    return dirname(url).split(separator).pop()!;
  }
  catch(err){
    return "File"
  }
}