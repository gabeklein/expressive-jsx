function selectAlso(){
  forEachChild(this.body, (select, body) => {
    this.setContingent(select, 5, body);
  })
}

function selectChild(){
  forEachChild(this.body, (select, body) => {
    this.setContingent(` ${select}`, 5, body);
  })
}

function forEachChild(body, callbackfn){
  if(!body)
    return;
  
  body = body.isBlockStatement()
    ? body.get("body") : [body];

  for(const item of body)
    switch(item.type){
      case "LabeledStatement": {
        const className = item.node.label.name;
        const body = item.get("body");

        callbackfn(`.${className}`, body);

        break;
      }

      case "IfStatement": {
        const { test } = item.node;

        if(test.type !== "StringLiteral")
          throw new Error("CSS if(selector) only supports strings right now.");

        callbackfn(test.value, item.get("consequent"));

        break;
      }

      default: 
        throw new Error("css modifier blew up");
    }
}

export {
  selectAlso as self,
  selectAlso as if,
  selectChild as child
}