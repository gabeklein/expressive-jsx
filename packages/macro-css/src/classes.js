import { pascalToDash } from './util';

const EXPORT = exports;

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

const SPECIFIC = [
  "not",
  "nthChild",
  "nthLastChild",
  "nthOfType",
  "nthLastOfType"
]

for(const name of [ ...STATE, ...POSITION ]){
  EXPORT[name] = function(){
    const select = ":" + pascalToDash(name);
    this.setContingent(select, 6);
  }
}

for(const name of SPECIFIC){
  EXPORT[name] = function(){
    const select = ":" + pascalToDash(name);
    const innerBody = this.body.node.body;
    let specifier;

    const i = innerBody.findIndex(x => x.label.name === "select");

    if(i >= 0){
      specifier = innerBody[i].body.expression.value;
      innerBody.splice(i, 1);
    }

    this.setContingent(`${select}(${specifier || "0"})`, 6);
  }
}