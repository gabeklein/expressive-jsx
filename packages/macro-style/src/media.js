const MIN_MAX = {
  ">": "min-",
  "<": "max-",
  "==": "",
  ">=": -1,
  "<=": 1
}

const SIZE = {
  width: "width",
  height: "height",
  deviceHeight: "device-height",
  deviceWidth: "device-width"
}

const SPECIAL = {
  WebkitDevicePixelRatio: "-webkit-device-pixel-ratio"
}

const KEYWORD = {
  landscape: "(orientation: landscape)",
  portrait: "(orientation: portrait)"
}

function Transform(e){
  if(typeof e == "string" && KEYWORD[e])
    return KEYWORD[e];
  else if(e.type == "binary"){
    let { operator, right, left } = e;
    if(operator[1] == "=="){
      right += MIN_MAX[operator];
      operator = operator[0]
    }

    let op = MIN_MAX[operator];
    let key = SIZE[left];

    if(key && typeof right == "number") right += "px";
    else key = SPECIAL[left]

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