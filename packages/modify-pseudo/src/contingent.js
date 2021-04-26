export function $css(){
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

    const className = "." + item.node.label.name;

    this.setContingent(className, 5, item.get("body"))
  }
}