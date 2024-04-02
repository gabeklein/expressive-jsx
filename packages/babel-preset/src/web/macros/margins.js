import { appendUnitToN } from '../util';

function margin(a1){
  let margin;

  if(arguments.length == 1 && a1 == "auto" || a1 == "none" || / /.test(a1))
    margin = a1
  else
    margin = Array.from(arguments).map(x => appendUnitToN(x)).join(" ")

  return {
    margin
  }
}

function padding(a1){
  let padding;

  if(arguments.length == 1 && a1 == "auto" || a1 == "none" || / /.test(a1))
    padding = a1
  else
    padding = Array.from(arguments).map(x => appendUnitToN(x)).join(" ")

  return {
    padding
  }
}

function marginTop(...args) {
  return {
    marginTop: appendUnitToN(...args)
  };
}

function marginLeft(...args) {
  return {
    marginLeft: appendUnitToN(...args)
  };
}

function marginRight(...args) {
  return {
    marginRight: appendUnitToN(...args)
  };
}

function marginBottom(...args) {
  return {
    marginBottom: appendUnitToN(...args)
  };
}

function paddingHorizontal(a, b){
  return {
    paddingLeft: a,
    paddingRight: b || a
  };
}

function paddingVertical(a, b){
  return {
    paddingTop: a,
    paddingBottom: b || a
  };
}

function marginHorizontal(a, b){
  return {
    marginLeft: a,
    marginRight: b || a
  };
}

function marginVertical(a, b){
  return {
    marginTop: a,
    marginBottom: b || a
  };
}

export {
  margin,
  padding
}

export {
  marginTop,
  marginLeft,
  marginRight,
  marginBottom,
  marginTop as marginT,
  marginLeft as marginL,
  marginRight as marginR,
  marginBottom as marginB,
}

export {
  paddingHorizontal as paddingH,
  paddingHorizontal,
  paddingVertical as paddingV,
  paddingVertical
}

export {
  marginHorizontal as marginH,
  marginHorizontal,
  marginVertical as marginV,
  marginVertical,
}