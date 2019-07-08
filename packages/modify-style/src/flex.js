const FlexDirections = {
    right: "row",
    left: "row-reverse",
    up: "column-reverse",
    down: "column",
    row: null,
    column: null,
    "row-reverse": null,
    "column-reverse": null
}

export function flexAlign(){

    const style = {
        display: "flex"
    }

    for(const arg of this.arguments){
        if(arg in FlexDirections)
            style.flexDirection = 
                FlexDirections[arg] || arg;
        else
        if(arg == "center")
            style.justifyContent = 
            style.alignItems = 
            "center"
        else
            style.justifyContent = arg;
    }

    return { style };
}
