import * as t from '../types';

export function setClassNames(
  path: t.NodePath<t.JSXElement>,
  classNames: t.Expression[]){

  const attributes = path.node.openingElement.attributes;
  const classNameProp = attributes.find(
    x => t.isJSXAttribute(x) &&
    x.name.name === "className"
  ) as t.JSXAttribute | undefined;

  if(classNameProp){
    const { value } = classNameProp;

    if(t.isJSXExpressionContainer(value)
    && t.isArrayExpression(value.expression))
      classNames.unshift(value.expression);
    
    if(t.isStringLiteral(value))
      classNames.unshift(value);
  }

  classNames = optimizeClassNames(classNames);

  const classNameValue = classNames.length == 1
    ? classNames[0]
    : t.callExpression(t.identifier("classNames"), classNames);
  
  const classNamePropValue = t.isStringLiteral(classNameValue)
    ? classNameValue
    : t.jsxExpressionContainer(classNameValue);

  if(classNameProp)
    classNameProp.value = classNamePropValue;
  else
    attributes.push(
      t.jsxAttribute(
        t.jsxIdentifier("className"),
        classNamePropValue
      )
    );
}

function optimizeClassNames(expressions: t.Expression[]){
  const optimized: t.Expression[] = [];

  for(const expr of expressions){
    if(t.isStringLiteral(expr)){
      const last = optimized[optimized.length - 1];

      if(t.isStringLiteral(last)){
        last.value += " " + expr.value;
        continue;
      }
    }

    optimized.push(expr);
  }

  return optimized;
}