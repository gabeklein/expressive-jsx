export function outline(a, b) {
  if (a == "none")
    return {
      outline: "none"
    };

  if (b == undefined)
    return {
      outline: `1px dashed ${a || "green"}`
    };

  const outline = Array.from(arguments)
    .map(x => typeof x == "number" ? `${x}px` : x)
    .join(" ");

  return {
    outline
  };
}