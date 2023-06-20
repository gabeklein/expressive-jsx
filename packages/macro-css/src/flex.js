const DIRECTIONS = {
  right: "row",
  left: "row-reverse",
  up: "column-reverse",
  down: "column",
  row: null,
  column: null,
  "row-reverse": null,
  "column-reverse": null
}

export function flexAlign(){
  const style = {
    display: "flex"
  }

  for(const arg of arguments){
    if(arg in DIRECTIONS){
      style.flexDirection = DIRECTIONS[arg] || arg;
    }
    else if(arg == "center"){
      style.justifyContent = "center"
      style.alignItems = "center"
    }
    else
      style.justifyContent = arg;
  }

  return style;
}

