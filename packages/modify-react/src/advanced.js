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

export function css(){
    const { data } = this.target;
    let list = data.classList;
    if(!list)
        list = data.classList = [];

    for(const className of this.arguments)
        list.push(className);
}