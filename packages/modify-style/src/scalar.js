function nToNUnits(value, unit) {
  if(value == "fill")
      value = "100%";

  if(value.named){
      unit = value.named;
      value = value.inner[0]
  }
  return {
      style: {
          [this.name]: appendUnitToN(value, unit)
      }
  }
}

exports.top = nToNUnits;
exports.left = nToNUnits;
exports.right = nToNUnits;
exports.bottom = nToNUnits;
exports.width = nToNUnits;
exports.height = nToNUnits;
exports.maxWidth = nToNUnits;
exports.maxHeight = nToNUnits;
exports.minWidth = nToNUnits;
exports.minHeight = nToNUnits;
exports.fontSize = nToNUnits;
exports.lineHeight = nToNUnits;
exports.outlineWidth = nToNUnits;
exports.borderRadius = nToNUnits;
exports.backgroundSize = nToNUnits;