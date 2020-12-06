import {
  booleanLiteral,
  callExpression,
  Expression,
  Identifier,
  identifier,
  isExpression,
  isTemplateLiteral,
  JSXIdentifier,
  JSXMemberExpression,
  MemberExpression,
  memberExpression,
  objectExpression,
  ObjectProperty,
  objectProperty,
  stringLiteral,
} from '@babel/types';
import { ArrayStack, ElementReact, GenerateReact } from 'internal';
import { dedent } from 'regenerate/quasi';
import { ContentLike, PropData } from 'types';

import { propertyES } from './syntax';

const IsComponentElement = /^[A-Z]\w*/;

export class GenerateES extends GenerateReact {

  get Fragment(){
    let id = this.external.ensure("$pragma", "Fragment");
    Object.defineProperty(this, "Fragment", { value: id });
    return id;
  }

  get Create(){
    let id = this.external.ensure(
      "$pragma", "createElement", "create"
    );

    Object.defineProperty(this, "Create", { value: id });
    return id;
  }

  element(src: ElementReact){
    const { tagName: tag, props, children } = src;

    const type = typeof tag == "string" ?
      IsComponentElement.test(tag) ? 
        identifier(tag) :
        stringLiteral(tag) :
      normalize(tag);

    return callExpression(
      this.Create, [
      type,
      this.recombineProps(props),
      ...this.recombineChildren(children)
    ])
  }

  fragment(
    children = [] as ContentLike[],
    key?: Expression | false
  ){
    const properties = [] as ObjectProperty[];
    if(key)
      properties.push(
        objectProperty(
          identifier("key"), key
        )
      )

    return (
      callExpression(
        this.Create, [
        this.Fragment,
        objectExpression(properties),
        ...this.recombineChildren(children)
      ])
    )
  }

  private recombineChildren(input: ContentLike[]): Expression[] {
    return input.map(child => (
      "toExpression" in child ?
        child.toExpression(this) :
      isExpression(child) ?
        isTemplateLiteral(child) ?
          dedent(child) :
        child :
      child instanceof ElementReact
        ? this.element(child)
        : booleanLiteral(false)
    ));
  }

  private recombineProps(props: PropData[]){
    const propStack = new ArrayStack<ObjectProperty, Expression>()

    if(props.length == 0)
      return objectExpression([])

    for(const { name, value } of props)
      if(!name)
        propStack.push(value);
      else
        propStack.insert(
          propertyES(name, value)
        );

    let properties = propStack.map(chunk =>
      Array.isArray(chunk)
        ? objectExpression(chunk)
        : chunk
    )

    if(properties[0].type !== "ObjectExpression")
      properties.unshift(
        objectExpression([])
      )

    return (
      properties.length == 1
        ? properties[0]
        : callExpression(
          memberExpression(
            identifier("Object"),
            identifier("assign")
          ),
          properties
        )
    )
  }
}

function normalize(
  exp: JSXMemberExpression | JSXIdentifier | Identifier
): MemberExpression | Identifier {

  switch(exp.type){
    case "JSXIdentifier":
      return identifier(exp.name);
    case "Identifier":
      return exp;
    case "JSXMemberExpression": {
      const a = normalize(exp.object);
      const b = normalize(exp.property);

      return memberExpression(a, b);
    }
    default:
      throw new Error("Bad MemeberExpression"); 
  }
}