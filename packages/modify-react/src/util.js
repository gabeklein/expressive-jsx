export function rect(a, b, c, d){
    const args = arguments;
    const { length } = args;
    let top, left, right, bottom;

    switch(args.length){
        case 0:
            a = 0
        case 1:
            top = left = right = bottom = a;
            break;
        case 2: 
            top = bottom = a
            left = right = b
            break;
        case 3:
            top = a
            bottom = c
            left = right = b
            break
        case 4:
            return args;
        default:
            throw new Error("Too many arguments for css 4-way value.")
    }

    return [top, right, bottom, left]
}

export function appendUnitToN(val, unit) {
    switch(typeof val){
        case "number":
            return val != 0 
                ? val + (unit || "px")
                : "0"

        case "string": 
            return val != "0"
                ? /^\d\.\d$/.test(val)
                    ? val + (unit || "em")
                    : val
                : "0"
        
        case "undefined":
            return ""

        default:
            return val
    }
}

export function handleUnits(name) {
    return function(){
        return {
            style: {
                [name]: appendUnitToN.apply(this, this.arguments)
            }
        }
    }
}