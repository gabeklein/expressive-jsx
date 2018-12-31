require('source-map-support').install();

import DoExpression from "./parse/doExpression"
import Program from "./parse/program"

export default (options: any) => ({
    manipulateOptions: (_: any, parse: any) => {
        parse.plugins.push("decorators-legacy", "doExpressions")
    },
    visitor: {
        Program,
        DoExpression
    }
})