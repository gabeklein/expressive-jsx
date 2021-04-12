import { pascalToDash } from "./util";

const EXPORT = exports;

const PSEUDO_CLASSES = [
  /** conditional state */
  "hover",
  "active",
  "focus",
  "valid",
  "invalid",
  "visited",
  "empty",
  "target",
  "checked",
  "disabled",
  "outOfRange",

  /** positional state */
  "firstChild",
  "lastChild",
  "onlyChild",
  "firstOfType",
  "lastOfType",
  "onlyOfType"
];

const PSEUDO_ELEMENTS = [
  "selection",
  "after",
  "before",
  "placeholder"
]

const PSEUDO_SPECIFIC = [
  "not",
  "nthChild",
  "nthLastChild",
  "nthOfType",
  "nthLastOfType"
]

for(const name of PSEUDO_CLASSES){
  EXPORT["$" + name] = function(){
    const select = ":" + pascalToDash(name);
    this.setContingent(select, 6);
  }
}

for(const name of PSEUDO_ELEMENTS){
  EXPORT["$" + name] = function(){
    const select = "::" + pascalToDash(name);
    const mod = this.setContingent(select, 6);
    const content = mod.containsStyle("content");

    if(content)
      content.value = `"${content.value}"`;
    else
      mod.addStyle("content", `""`);
  }
}

for(const name of PSEUDO_SPECIFIC){
  EXPORT["$" + name] = function(){
    const select = ":" + pascalToDash(name);
    const innerBody = this.body.node.body;
    let specifier;

    let i = innerBody.findIndex(x => x.label.name === "select");

    if(i >= 0){
      specifier = innerBody[i].body.expression.value;
      innerBody.splice(i, 1);
    }

    this.setContingent(`${select}(${specifier || "0"})`, 6);
  }
}

export function css(){
  let body = this.body;

  if(body){
    if(body.type == "BlockStatement")
      body = body.get("body");
    else
      body = [body];

    for(const item of body){
      const className = "." + item.label.name;
      if(!item.type == "LabeledStatement")
        throw new Error("css modifier blew up")
      this.setContingent(className, 5, item.body)
    }

    return;
  }

  const { data } = this.target;
  let list = data.classList;

  if(!list)
    list = data.classList = [];

  for(const className of this.arguments)
    list.push(pascalToDash(className));
}