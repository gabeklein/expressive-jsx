export { css as default } from "./css";

export function classNames(...args: string[]){
  return args.filter(x => x).join(" ");
}

export function collect(
  acc: (add: (item: any) => void) => void){

  const sum: any[] = [];
  acc(sum.push.bind(sum));
  return sum;
}