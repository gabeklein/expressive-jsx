export function camelToDash(x: string){
  return x.replace(/([A-Z]+)/g, "-$1").toLowerCase();
}