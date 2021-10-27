export function image(a){
  return {
    style: {
      backgroundImage: `url("${a}")`
    }
  }
}

function requireExpression(value){
  return {
    type: "CallExpression",
    callee: { type: "Identifier", name: "require" },
    arguments: [
      { type: "StringLiteral", value }
    ]
  }
}

export function background(value, size, position){
  const style = {};

  if(size)
    style.backgroundSize = size;

  if(position)
    style.backgroundPosition = position;

  if(/^\.\.?\//.test(value))
    style.backgroundImage = {
      type: "TemplateLiteral",
      expressions: [
        requireExpression(value)
      ],
      quasis: [
        {
          type: "TemplateElement",
          value: { raw: "url(", cooked: "url(" },
          tail: false
        },
        {
          type: "TemplateElement",
          value: { raw: ")", cooked: ")" },
          tail: true
        }
      ]
    }
  else
    style.background = value;

  return { style };
}

export function backgroundImage(a){
  if(typeof a == "object" && !a.named)
    return { style: {
      backgroundImage: a
    }}
  else
    return { attrs: {
      backgroundImage: this.arguments
    }}
}

export function icon(mask, color){
  if(!mask) return;

  if(mask.indexOf(".svg") < 0)
    mask = mask.concat(".svg")

  const attrs = {
    WebkitMaskImage: `url(\"${mask}\")`
  }

  if(color)
    attrs.bg = color;

  return { attrs }
}