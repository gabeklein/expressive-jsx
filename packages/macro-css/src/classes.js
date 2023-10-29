import { pascalToDash } from './util';

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

const POSITION = [
  "firstChild",
  "lastChild",
  "onlyChild",
  "firstOfType",
  "lastOfType",
  "onlyOfType"
]

for(const name of [ ...STATE, ...POSITION ])
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

export default css;