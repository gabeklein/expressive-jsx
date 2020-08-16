const MinMax = {
  ">": "min-",
  "<": "max-",
  "==": "",
  ">=": -1,
  "<=": 1
}

const Size = {
  width: "width",
  height: "height",
  deviceHeight: "device-height",
  deviceWidth: "device-width"
}

const Special = {
  WebkitDevicePixelRatio: "-webkit-device-pixel-ratio"
}

const Keywords = {
  landscape: "(orientation: landscape)",
  portrait: "(orientation: portrait)"
}

function Transform(e){
  if(typeof e == "string" && Keywords[e])
    return Keywords[e];
  else if(e.type == "binary"){
    let { operator, right, left } = e;
    if(operator[1] == "=="){
      right += MinMax[operator];
      operator = operator[0]
    }

    let op = MinMax[operator];
    let key = Size[left];

    if(key && typeof right == "number") right += "px";
    else key = Special[left]

    if(key && op !== undefined){
      return `(${op}${key}: ${right})`
    }
  }
}

export function screen(){
  let { body } = this;
  body = body.type == "BlockStatement"
    ? body.get("body")
    : body.type == "IfStatement"
    ? [body]
    : [];

  for(const node of body)
  if(node.type == "IfStatement"){
    let query = this.parse(node.get("test"));
      query = query.map(Transform).join(" and ");

    this.declareMediaQuery(
      'only screen' + (query ? ' and ' + query : ''),
      node.get("consequent")
    );
  }
}

export function mobile(){
  this.declareMediaQuery(
    "only screen and (max-width: 800px)",
    this.body
  );
}