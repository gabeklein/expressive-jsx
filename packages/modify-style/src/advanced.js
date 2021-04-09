import { pascalToDash } from "./util";

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
  beforeOnActive: ":active::before",
  placeholder: "::placeholder"
}

export function nthOfType(){
  const inner = this.body.node.body;
  let i = 0;
  let select;

  for(const item of inner){
    if(item.label.name !== "select"){
      i++;
      continue;
    }
    else {
      inner.splice(i, 1);
      select = item.body.expression.value;
    }
  }

  this.setContingent(`:nth-of-type(${select})`, 6);
}

for(const name in PSEUDO){
  let priority = ~name.indexOf("Active") ? 7 : 6;

  EXPORT[name] = function(){
    const select = PSEUDO[name];
    const mod = this.setContingent(select, priority);
    
    if(/^::/.test(select)){
      const exist = mod.containsStyle("content");

      if(exist)
        exist.value = `"${exist.value}"`;
      else
        mod.addStyle("content", `""`);
    }
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

  for(const className of this.arguments){
    list.push(pascalToDash(className));
  }
}