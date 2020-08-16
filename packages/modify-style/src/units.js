export function addUnit(n){
  if(isNaN(n))
    return n;
  if(n == 0) 
    return 0;
  if(Math.round(n) === n)
    return n + "px";
  else
    return n + "em"
}

export function appendUnitToN(val, unit) {
  if(val === 0)
    return "0"

  if(val === undefined)
    return ""

  if(typeof val == "number")
    return val + (unit || "px")

  if(/^\d\.\d$/.test(val))
    return val + (unit || "em")

  return val
}