const MinMax = {
    ">": "min-",
    "<": "max-",
    "==": "",
    ">=": -1,
    "<=": 1
}

const Size = {
    width: "width",
    height: "height",
    deviceHeight: "device-height",
    deviceWidth: "device-width"
}

const Special = {
    WebkitDevicePixelRatio: "-webkit-device-pixel-ratio"
}

const Keywords = {
    landscape: "(orientation: landscape)",
    portrait: "(orientation: portrait)"
}

function Transform(e){
    if(typeof e == "string" && Keywords[e])
        return Keywords[e];
    else if(e.type == "assign"){
        const { operator, left: key, right } = e;
        if(right.operator !== ">>")
            throw new Error(`operator for ${key} must be >>`)
        const {left: min, right: max} = right;

        return `(min-${key}: ${min}px) and (max-${key}: ${max}px)`;
    }
    else if(e.type == "binary"){
        let { operator, right, left } = e;
        let prefix = "";

        let key = Size[left];

        if(operator == "==")
            return `(min-${key}: ${right}px) and (max-${key}: ${right}px)`;

        if(key && typeof right == "number"){
            switch(operator[0]){
                case ">":
                    prefix = "min-";
                    if(!operator[1])
                        right += 1
                break;
                case "<":
                    prefix = "max-";
                    if(!operator[1])
                        right -= 1
                break;
            }
            return `(${prefix}${key}: ${right}px)`
        }
        else 
            return Special[left];
    }
}

export function screen(){
    let { body } = this;
    body = body.type == "BlockStatement"
         ? body.get("body")
         : body.type == "IfStatement"
         ? [body]
         : [];

    for(let node of body)
        if(node.isIfStatement()){
            const queries = [];
            do {
                let query = this.parse(node.get("test"));
                    query = query.map(Transform).join(" and ");
                    query = "only screen".concat(query && ` and ${query}` || '')

                queries.push(query)
                node = node.get("consequent")
            }
            while(node.isIfStatement());

            this.declareMediaQuery(
                queries.join(", "),
                node
            );
        }
}

export function mobile(){
    this.declareMediaQuery(
        "only screen and (max-width: 800px)",
        this.body
    );
}