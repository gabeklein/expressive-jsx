export function shadow(color, radius = 10, x = 2, y = x){
  let value;

  if(color == "intial" || color == "none")
    value = color;
  else
    value = `${x}px ${y}px ${radius}px ${color}`;

  return {
    style: {
      boxShadow: value
    }
  }
}