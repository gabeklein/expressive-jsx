const EXPORT = exports;

const PSEUDO = {
    onHover: ":hover",
    onActive: ":active",
    onFocus: ":focus",
    after: "::after",
    before: "::before",
    afterOnHover: ":hover::after",
    beforeOnHover: ":hover::before",
    afterOnFocus: ":focus::after",
    beforeOnFocus: ":focus::before",
    afterOnActive: ":active::after",
    beforeOnActive: ":active::before"
}

for(const name in PSEUDO){
    let priority = ~name.indexOf("Active") ? 7 : 6;
    EXPORT[name] = function(){
        this.setContingent(PSEUDO[name], priority)
    }
}

// const PascalToDash = x => x.replace(/([A-Z]+)/g, "-$1").toLowerCase();

export function css(){
    let body = this.body;
    if(body && body.isStatement()){
        if(body.isBlockStatement())
            body = body.get("body");
        else
            body = [body];

        for(const item of body){
            const className = "." + item.node.label.name;
            if(!item.isLabeledStatement())
                throw new Error("css modifier blew up")
            this.setContingent(className, 5, item.get("body"))
        }

        return;
    }

    const { data } = this.target;
    let list = data.classList;
    if(!list)
        list = data.classList = [];

    for(const className of this.arguments){
        list.push(PascalToDash(className));
    }
}