import { pascalToDash } from './util';

const EXPORT = exports;

const PSEUDO_ELEMENTS = [
  "selection",
  "after",
  "before",
  "placeholder"
]

for(const name of PSEUDO_ELEMENTS){
  EXPORT[name] = function(){
    const select = "::" + pascalToDash(name);
    const mod = this.setContingent(select, 6);
    const content = mod.hasStyle("content");

    if(content)
      content.value = `"${content.value}"`;
    else
      mod.addStyle("content", `""`);
  }
}

