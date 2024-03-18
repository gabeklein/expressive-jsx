import { NodePath } from '@babel/traverse';
import { BlockStatement, Expression, Function, Identifier, Node, ObjectProperty } from '@babel/types';

import { onExit } from '../plugin';
import { getName, uniqueIdentifier } from '../syntax/names';
import { t } from '../types';
import { getContext } from './Context';
import { DefineContext } from './DefineContext';

export class FunctionContext extends DefineContext {
  body: NodePath<BlockStatement | Expression>;

  constructor(public path: NodePath<Function>) {
    const name = getName(path);
    const ctx = getContext(path);
    const body = path.get("body");

    super(name, ctx, path);

    this.body = body;
    this.define["this"] = this;

    onExit(path, () => {
      if(body.isBlockStatement() && body.get("body").length == 0)
        body.pushContainer("body", t.expressionStatement(
          t.jsxElement(
            t.jsxOpeningElement(t.jsxIdentifier("this"), [], true),
            undefined, [], true
          )
        ));
    });
  }

  get className() {
    if(!this.empty || this.dependant.length)
      return super.className;
  }

  getProp(name: string) {
    const { node, scope } = this.path;
    let [props] = node.params;

    if(t.isObjectPattern(props)) {
      const { properties } = props;

      const prop = properties.find(x => (
        t.isObjectProperty(x) &&
        t.isIdentifier(x.key, { name })
      )) as ObjectProperty | undefined;

      if(prop)
        return prop.value as Identifier;

      const id = t.identifier(name);

      properties.unshift(
        t.objectProperty(id, id, false, true)
      );

      return id;
    }
    else if(!props) {
      props = uniqueIdentifier(scope, "props");
      node.params.unshift(props);
    }

    if(t.isIdentifier(props))
      return t.memberExpression(props, t.identifier(name));

    throw new Error(`Expected an Identifier or ObjectPattern, got ${props.type}`);
  }

  getProps() {
    const { scope, node: { params } } = this.path;
    let [ props ] = params
    let output: Node | undefined;

    if(!props){
      params.push(output = uniqueIdentifier(scope, "props"));
    }
    else if(t.isObjectPattern(props)){
      const existing = props.properties.find(x => t.isRestElement(x));

      if(t.isRestElement(existing))
        output = existing.argument;

      const inserted = t.restElement(uniqueIdentifier(scope, "rest"));
      
      props.properties.push(inserted)

      output = inserted.argument;
    }
    else
      output = props;

    if(t.isIdentifier(output))
      return output;

    throw new Error("Could not extract props from function.")
  }
}
