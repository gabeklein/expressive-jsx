const t = require("babel-types");

export default () => ({
    visitor: {
        BinaryExpression: {
            enter: iterableToIndexOf
        }
    }
})

function iterableToIndexOf(path){
    if(path.node.operator != "in")
        return;

    let { right } = path.node;

    switch(right.type){
        case "StringLiteral": 
            right = t.arrayExpression(
                right.value
                    .split(/, +/)
                    .map(e => t.stringLiteral(e))
            )
        break;

        case "TemplateLiteral":
            right = t.callExpression(
                t.memberExpression(
                    right,
                    t.identifier("split")
                ),
                [t.regExpLiteral(", +")]
            )
        break;

        case "UnaryExpression":
            if(right.operator != "!")
                throw path.get("right").buildCodeFrameError(
                    "Could not transform into indexOf \
                     expression, only unary ! is recognized.")
            right = right.argument;
        break;

        case "ArrayExpression": break;

        default: return;
    }

    path.replaceWith(
        t.unaryExpression("~", 
            t.callExpression(
                t.memberExpression(
                    right, t.identifier("indexOf")
                ), [
                    path.node.left
                ]
            )
        )
    )
}