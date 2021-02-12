import { booleanLiteral, CallExpression, Expression, Identifier, JSXElement, JSXMemberExpression } from '@babel/types';
import { StackFrame } from 'context';
import { ElementReact } from 'translate';
import { ContentLike, PropData } from 'types';
import { createElement as createJS } from './es5';
import { createElement as createJSX } from './jsx';

export class GenerateReact {
  constructor(
    private context: StackFrame){

    const create = context.opts.output === "js" ? createJS : createJSX;
    this.createElement = create.bind(context);
  }

  private createElement: (
    tag: null | string | JSXMemberExpression,
    properties?: PropData[],
    content?: ContentLike[]
  ) => CallExpression | JSXElement;

  element(src: ElementReact){
    return this.createElement(src.tagName, src.props, src.children);
  }

  fragment(
    children = [] as ContentLike[],
    key?: Expression
  ){
    let props = key && [{ name: "key", value: key }];
    return this.createElement(null, props, children)
  }

  container(
    src: ElementReact,
    key?: Identifier
  ): Expression {

    let output: ContentLike | undefined;

    if(src.props.length == 0){
      const { children } = src;

      if(children.length == 0)
        return booleanLiteral(false);

      if(children.length > 1)
        return this.fragment(children, key);

      output = children[0];
    }

    if(!output)
      output = this.element(src)

    else if("toExpression" in output)
      output = output.toExpression(this.context)

    else if(output instanceof ElementReact)
      output = this.element(output)

    if(key)
      return this.fragment([ output ], key)
    else
      return output
  }
}