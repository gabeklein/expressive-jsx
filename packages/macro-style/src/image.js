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
  const attrs = {};

  if(/^\.\.?\//.test(value))
    attrs.backgroundImage = value;
  else
    attrs.background = value;

  if(size)
    attrs.backgroundSize = size;

  if(position)
    attrs.backgroundPosition = position;

  return { attrs };
}

export function backgroundImage(from){
  if(/^\.\.?\//.test(from))
    return {
      style: {
        backgroundImage: {
          type: "TemplateLiteral",
          expressions: [
            requireExpression(from)
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
      }
    }

  if(typeof from == "object" && !from.named)
    return {
      style: {
        backgroundImage: from
      }
    }
    
  return {
    attrs: {
      backgroundImage: this.arguments
    }
  }
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