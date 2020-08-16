export function clickable(){
  return {
    attrs: {
      cursor: "pointer",
      WebkitUserSelect: "none"
    }
  }
}

export function select(a){
  if(a == "none") return {
    style: {
      WebkitUserSelect: "none",
      MoxUserSelect: "none",
      userSelect: "none"
    }
  }
}