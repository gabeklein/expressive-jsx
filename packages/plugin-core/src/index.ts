import DoExpression from 'parse/doExpression';
import Program from 'parse/program';

export {
    ElementConstruct
} from "internal";

export {
    ComponentExpression,
    ComponentIf,
    Prop,
    ElementInline,
	ExplicitStyle,
    ContingentModifier
} from "handle";

export {
    ParseErrors
} from 'shared';

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