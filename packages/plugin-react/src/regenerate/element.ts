import { booleanLiteral, CallExpression, Expression, Identifier, JSXElement } from '@babel/types';
import { ExternalsManager } from 'regenerate';
import { ElementReact } from 'translate';
import { ContentLike } from 'types';

export abstract class GenerateReact {
  constructor(
    protected Imports: ExternalsManager
  ){}

  abstract element(
    src: ElementReact
  ): CallExpression | JSXElement;

  abstract fragment(
    children?: ContentLike[],
    key?: Expression
  ): CallExpression | JSXElement;

  public container(
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
      output = output.toExpression(this)

    else if(output instanceof ElementReact)
      output = this.element(output)

    if(key)
      return this.fragment([ output ], key)
    else
      return output
  }
}