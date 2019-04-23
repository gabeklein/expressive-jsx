const EXPORT = exports;

const PSEUDO = {
    hover: ":hover",
    active: ":active",
    focus: ":focus",
    after: "::after",
    before: "::before",
    afterOnHover: ":hover::after",
    beforeOnHover: ":hover::before",
    afterOnFocus: ":focus::after",
    beforeOnFocus: ":focus::before"
}

for(const name in PSEUDO)
    EXPORT[name] = function(){
        this.setContingent(PSEUDO[name])
    }
