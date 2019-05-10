import DoExpression from 'parse/doExpression';
import Program from 'parse/program';

export {
    ParseErrors
} from 'shared';

export {
    ComponentExpression,
    ComponentIf,
    Prop,
    ElementInline,
	ExplicitStyle,
    ContingentModifier
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