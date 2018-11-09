const DIRECTION = {
    row: "row",
    right: "row",
    left: "row-reverse",
    up: "column-reverse",
    down: "column",
    column: "column",
    col: "column"
}

export function flexDirection(dir){
    return {
        style: { flexDirection: DIRECTION[dir] }
    }
}

export function flexAlign(mode, direction = "right"){

    const style = {};

    if(mode in DIRECTION)
        direction = mode;

    else if(mode == "center")
        style.justifyContent = style.alignItems = "center"
    else
        style.justifyContent = mode;

    if(direction = DIRECTION[direction] || direction)
        style.flexDirection = direction;

    return { style };
}
