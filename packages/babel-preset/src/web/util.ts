export function camelToDash(x: string){
  return x.replace(/([A-Z]+)/g, "-$1").toLowerCase();
}

export function appendUnitToN(val: number | string, unit: string){
  if(val === 0)
    return "0";

  if(val === undefined)
    return "";

  if(typeof val == "string" && /\./.test(val) && !isNaN(parseFloat(val)))
    return val + (unit || "em");

  if(typeof val == "number" || parseInt(val) === Number(val))
    return val + (unit || "px");

  return val
}