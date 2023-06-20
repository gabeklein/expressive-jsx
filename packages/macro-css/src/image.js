export function image(a){
  return {
    backgroundImage: `url("${a}")`
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
  const output = {};

  if(/^\.\.?\//.test(value))
    output.backgroundImage = value;
  else
    output.background = value;

  if(size)
    output.backgroundSize = size;

  if(position)
    output.backgroundPosition = position;

  return output
}

export function backgroundImage(from){
  if(/^\.\.?\//.test(from))
    return {
      backgroundImage: {
        type: "TemplateLiteral",
        expressions: [
          requireExpression(from)
        ],
        quasis: [
          {
            type: "TemplateElement",
            value: {
              raw: "url(",
              cooked: "url("
            },
            tail: false
          },
          {
            type: "TemplateElement",
            value: {
              raw: ")",
              cooked: ")"
            },
            tail: true
          }
        ]
      }
    }

  if(typeof from == "object" && !from.named)
    return {
      backgroundImage: from
    }
    
  return {
    backgroundImage: Array.from(arguments)
  }
}

export function icon(mask, color){
  if(!mask) return;

  if(!mask.includes(".svg"))
    mask = mask.concat(".svg")

  const output = {
    WebkitMaskImage: `url(\"${mask}\")`
  }

  if(color)
    output.bg = color;

  return output;
}