export function addUnit(n){
  if(isNaN(n))
    return n;
  if(n == 0)
    return 0;
  if(parseInt(n) === n)
    return n + "px";
  else
    return n + "em";
}

export function appendUnitToN(val, unit) {
  if(val === 0)
    return "0";

  if(val === undefined)
    return "";

  if(typeof val == "string" && /\./.test(val) && !isNaN(parseFloat(val)))
    return val + (unit || "em");

  if(parseInt(val) === val)
    return val + (unit || "px");

  return val
}