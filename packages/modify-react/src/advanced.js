const PSEUDO = {
    hover: ":hover",
    active: ":active",
    focus: ":focus",
    after: "::after",
    before: "::before",
    hoverAfter: ":hover::after",
    hoverBefore: ":hover::before",
    focusAfter: ":focus::after",
    focusBefore: ":focus::before"
}

function on(){
    this.priority = 7;
    const block = normalize(this.body);
    for(const x of block){
        let { name } = x.node.label;
        const body = x.get("body");

        if(name = PSEUDO[name])
            this.declareElementModifier(name, body);
    }
}

export function onHover(){
    this.priority = 7;
    this.declareElementModifier(":hover", this.body);
}

export function onFocus(){
    this.priority = 7;
    this.declareElementModifier(":focus", this.body);
}

export function onActive(){
    this.priority = 7;
    this.declareElementModifier(":active", this.body);
}

export function pseudo(){
    this.priority = 6;
    this.declareElementModifier("::both", this.body);
}

export function after(){
    this.priority = 7;
    this.declareElementModifier("::after", this.body);
    //TODO: auto insert content if does not already exist
}

export function before(){
    this.priority = 7;
    this.declareElementModifier("::before", this.body);
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
    this.target.onComponent((target, inline) => {
        const src = target.attrs.find(x => x.name == "src");
        if(src){
            debugger;
            // src.node = 
        }
    })
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