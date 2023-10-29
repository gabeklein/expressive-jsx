export function shadow(color, radius = 10, x = 2, y = x){
  const boxShadow = color == "intial" || color == "none"
    ? color
    : `${x}px ${y}px ${radius}px ${color}`;

  return {
    boxShadow
  }
}