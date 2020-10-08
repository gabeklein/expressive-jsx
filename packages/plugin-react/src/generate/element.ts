import { booleanLiteral, CallExpression, Expression, Identifier, JSXElement } from '@babel/types';
import { ElementReact, ExternalsManager, Module } from 'internal';
import { ContentLike } from 'types';

export abstract class GenerateReact {

  constructor(
    protected module: Module,
    protected external: ExternalsManager
  ){}

  didEnterModule?(): void;
  willExitModule?(): void;

  abstract fragment(
    children?: ContentLike[],
    key?: Expression | false
  ): CallExpression | JSXElement

  abstract element(
    src: ElementReact
  ): CallExpression | JSXElement;

  public container(
    src: ElementReact,
    fragmentKey?: Identifier | false
  ): Expression {

    let output: ContentLike | undefined;

    if(src.props.length == 0){
      const { children } = src;

      if(children.length == 0)
        return booleanLiteral(false);

      if(children.length > 1)
        return this.fragment(children, fragmentKey);

      output = children[0];
    }

    if(!output)
      output = this.element(src)

    else if("toExpression" in output)
      output = output.toExpression(this)

    else if(output instanceof ElementReact)
      output = this.element(output)

    if(fragmentKey)
      return this.fragment([ output ], fragmentKey)
    else
      return output
  }
}