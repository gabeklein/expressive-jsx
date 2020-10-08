import { DoExpression, Program } from 'parse';

export {
  ParseErrors
} from 'shared';

export {
  ComponentExpression,
  ComponentIf,
  ContingentModifier,
  ElementInline,
  ExplicitStyle,
  Prop,
  ElementModifier
} from "handle";

export {
  ElementConstruct
} from "generate";

export default (options: any) => {
  return {
    manipulateOptions: (options: any, parse: any) => {
      parse.plugins.push("decorators-legacy", "doExpressions", "jsx")
    },
    visitor: {
      Program,
      DoExpression
    }
  }
}