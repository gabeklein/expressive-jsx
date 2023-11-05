import { pascalToDash } from '../util';

const css = {};

const STATE = [
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
  "outOfRange"
];

const INDEX = [
  "firstChild",
  "lastChild",
  "onlyChild",
  "firstOfType",
  "lastOfType",
  "onlyOfType"
]

for(const name of [ ...STATE, ...INDEX ])
  css[name] = function(){
    const select = ":" + pascalToDash(name);
    this.setContingent(select, 6);
  }

const SPECIFIC = [
  "not",
  "nthChild",
  "nthLastChild",
  "nthOfType",
  "nthLastOfType"
]

for(const name of SPECIFIC)
  css[name] = function(){
    const select = ":" + pascalToDash(name);
    const innerBody = this.body.node.body;
    let specifier;

    const i = innerBody.findIndex(x => x.label.name === "select");

    if(i >= 0){
      specifier = innerBody[i].body.expression.value;
      innerBody.splice(i, 1);
    }

    this.setContingent(select + `(${specifier || "0"})`, 6);
  }

const PSEUDO = [
  "selection",
  "after",
  "before",
  "placeholder"
]

for(const name of PSEUDO){
  css[name] = function(){
    const select = "::" + pascalToDash(name);
    const mod = this.setContingent(select, 6);
    const content = mod.hasStyle("content");

    if(content)
      content.value = `"${content.value}"`;
    else
      mod.addStyle("content", `""`);
  }
}

export default css;