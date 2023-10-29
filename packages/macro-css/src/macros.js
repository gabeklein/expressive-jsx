export function clickable(){
  return {
    cursor: "pointer",
    WebkitUserSelect: "none"
  }
}

export function select(a){
  if(a == "none") return {
    WebkitUserSelect: "none",
    MoxUserSelect: "none",
    userSelect: "none"
  }
}

export function centered(maxWidth, padding){
  const attrs = { marginH: "auto" };

  if(maxWidth)
    attrs.maxWidth = maxWidth;

  if(padding)
    attrs.paddingH = padding;

  return { attrs };
}