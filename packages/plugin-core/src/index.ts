import DoExpression from 'parse/doExpression';
import Program from 'parse/program';


export {
    ElementConstruct,

    ComponentExpression,
    ComponentIf,
    Prop,
    ParseErrors,
    ElementInline,
	ExplicitStyle,
    ContingentModifier
} from "internal";

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