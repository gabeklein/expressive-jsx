export function pascalToDash(x){
  return x.replace(/([A-Z]+)/g, "-$1").toLowerCase();
}