const PSEUDO = {
    hover: ":hover",
    after: ":after",
    before: ":before",
    active: ":active"
}

export { pseudo as on };

function pseudo(){
    this.priority = 6;
    const block = normalize(this.body);
    for(const x of block){
        let { name } = x.node.label;
        const body = x.get("body");

        if(name = PSEUDO[name])
            this.declareElementModifier(name, body, function selectPseudo(){
                let { selectAgainst } = this;
                selectAgainst = selectAgainst.classname || selectAgainst.generateClassName();
                return selectAgainst + name;
            });
    }
}

function normalize(body) {
    return (
        body.type == "LabeledStatement" ? [body] :
        body.type == "BlockStatement" && body.get("body")
    ) 
}

function directClassname(){
    let { selectAgainst } = this;
    selectAgainst = selectAgainst.classname || selectAgainst.generateClassName();
    return selectAgainst + " " + this.name;
}

export function css(){
    if(this.body.type != "ExpressionStatement"){
        const block = normalize(this.body);
        for(const mod of block) 
            if(mod.type == "LabeledStatement") {
                const name = mod.node.label.name;
                const body = mod.get("body");

                this.declareElementModifier("." + name, body, directClassname);
            }
        return;
    }
        
    const { classList } = this.target;
    let props = {};
    for(const arg of this.arguments)
        if(typeof arg == "string")
            if(arg[0] == "$")
                props.id = arg.substring(1)
            else if(classList.indexOf(arg) < 0)
                classList.push(arg);
    if(props.id)
        return { props }
}


export function source(a){
    return {
        style: {
            source: {
                require: a
            }
        }
    }
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