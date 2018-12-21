import { Path, BabelState } from "./types";
import { Program } from "@babel/types";
import { StackFrame } from "./scope";

export function enter(
    path: Path<Program>,
    state: BabelState ){

    state.context = new StackFrame(state);
}

export function exit(
    path: Path<Program>,
    state: BabelState ){
        
    if(~process.execArgv.join().indexOf("inspect-brk"))
        console.log("done")
}