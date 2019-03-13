import DoExpression from 'parse/doExpression';
import Program from 'parse/program';

export { 
    DoExpressive
} from "types"

export {
	ExplicitStyle,
    ElementInline,
	SpreadItem,
    Prop,
    Syntax,
    Element,
    AssembleElement,
    Attribute,
    InnerStatement,
    NonComponent,
    ComponentExpression,
    ComponentConsequent,
    ComponentIf as ComponentSwitch
} from "internal";

export default (options: any) => {
    return {
        manipulateOptions: (options: any, parse: any) => {
            parse.plugins.push("decorators-legacy", "doExpressions")
        },
        visitor: {
            Program,
            DoExpression
        }
    }
}