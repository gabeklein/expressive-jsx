export function pascalToDash(x){
  return x.replace(/([A-Z]+)/g, "-$1").toLowerCase();
}

export function addUnit(n){
  if(isNaN(n))
    return n;

  if(n == 0)
    return 0;

  if(parseInt(n) === n)
    return n + "px";
  
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

export function nToNUnits(value, unit) {
  if(value == "fill")
    value = "100%";

  if(value.named){
    unit = value.named;
    value = value.inner[0]
  }

  return appendUnitToN(value, unit);
}