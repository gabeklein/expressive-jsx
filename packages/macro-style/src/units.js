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

  if(parseInt(val) === val)
    return val + (unit || "px");

  if(parseFloat(val) === val)
    return val + (unit || "em");

  return val
}