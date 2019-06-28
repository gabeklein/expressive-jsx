const isStackTrace = /\s*at/;
const breakdownTrace = /at (.+) \(.+packages\/plugin-(.+):(\d+):(\d+)/;
const isCodeFrame = /\s*[>0-9]/;

module.exports = function onFault(e){
    let [error, ...trace] = e.stack.split("\n");
    const [errorType, errorStatement] = error.split(/:.+:/);

    let preview = "";
    let stackTrace = [];

    for(let i = 0, line; line = trace[i]; i++)
        if(isStackTrace.test(line) == false)
            preview += line + "\n";
        else {
            trace = trace.slice(i + 1);
            break;
        }

    trace = trace.filter(x => x.indexOf("node_modules") < 0);

    const parseError = /at Object\.ParseErrors.+\[as (\w+)]/.exec(trace[0]);

    if(parseError){
        preview = `Error: ${parseError[1]}\n\n` + preview;
        trace = trace.slice(1);
    }
    else {
        preview = `${errorType}:${errorStatement}\n\n` + preview;
    }

    let marginMax = trace.reduce(
        (margin, string) => Math.max(margin, string.indexOf("(/"))
    , 0);

    for(const line of trace){
        const match = isStackTrace.exec(line);

        if(!match)
            preview += line + "\n";
        else if(match[1])
            continue;
        else {
            const location = breakdownTrace.exec(line);
            if(!location)
                continue;

            const [, scope, file, ln, column] = location;
            const spacing = Array(marginMax - line.indexOf("(/")).fill(" ").join("");
            const relative = file.replace(/\/src/, "");
            
            stackTrace.push(`  at ${scope}${spacing}   ${relative}:${ln} \n`);
        }
    }

  console.error("\n" + preview + "\n" + stackTrace.join("") + "\n");
}