export function screen(a){
    if(!a || a.type !== "if")
        throw [0, "screen modifier expects if statements"]

    const { test } = a;

    return {
        contingent: {
            media: {"max-width": "500px"},
            when: a.path.get("consequent"),
            ifno: a.path.get("alternate")
        },
    }
}

export function css(){
    const { classList } = this.target;
    let props = {};
    for(const arg of arguments)
        if(typeof arg == "string")
            if(arg[0] == "$")
                props.id = arg.substring(1)
            else if(classList.indexOf(arg) < 0)
                classList.push(arg);
    if(props.id)
        return { props }
        
}

export function style(content){
    const { target } = this;

    if(!target.generateClassName)
        throw new Error("Modifier style can only apply to components!")
    const classname = target.generateClassName();
    target.classList.push(classname);
    target.children.push({
        inlineType: "child",
        transform: () => ({
            product: transform.createElement(
                t.stringLiteral("style"),
                t.objectExpression([]),
                t.binaryExpression("+", 
                    t.binaryExpression("+",
                        t.stringLiteral(`.${classname} {`),
                        typeof content == "string"
                            ? t.stringLiteral(content)
                            : content.node
                    ),
                    t.stringLiteral(`}`)
                )
            )
        }) 
    })
}