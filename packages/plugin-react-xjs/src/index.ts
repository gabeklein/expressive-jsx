require('source-map-support').install();

import * as Class from "./class";
import * as DoExpression from "./doExpression"
import * as Program from "./program"

export default (options: any) => ({
    manipulateOptions: (_: any, parse: any) => {
        parse.plugins.push("decorators-legacy", "doExpressions")
    },
    visitor: {
        Program,
        Class,
        DoExpression
    }
})