import { pascalToDash } from "./util";

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