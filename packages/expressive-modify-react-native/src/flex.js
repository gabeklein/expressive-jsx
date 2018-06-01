const DIRECTION = {
    right: "row",
    left: "row-reverse",
    up: "column-reverse",
    down: "column"
}

export function flexAlign(mode, direction = "right"){

    const style = {
        display: "flex"
    }

    if(mode == "center")
        style.justifyContent = 
        style.alignItems = 
        "center"

    if(direction = DIRECTION[direction] || direction)
        style.flexDirection = direction;

    return { style };
}
