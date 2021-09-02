import { pascalToDash } from "./util";

function hasAlso(){
  let { body } = this;

  if(!body)
    return
  
  if(body.type == "BlockStatement")
    body = body.get("body");
  else
    body = [body];

  for(const item of body){
    if(!item.type == "LabeledStatement")
      throw new Error("css modifier blew up");

    const className = "." + pascalToDash(item.node.label.name);

    this.setContingent(className, 5, item.get("body"))
  }
}

function hasInner(){
  let { body } = this;

  if(!body)
    return
  
  if(body.type == "BlockStatement")
    body = body.get("body");
  else
    body = [body];

  for(const item of body){
    if(!item.type == "LabeledStatement")
      throw new Error("css modifier blew up");

    const className = " ." + pascalToDash(item.node.label.name);

    this.setContingent(className, 5, item.get("body"))
  }
}

export {
  hasAlso as has,
  hasInner as inner
}