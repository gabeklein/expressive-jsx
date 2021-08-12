import { RuntimeStyle } from "./styles";

export default new RuntimeStyle();

export function body(props: { children: any | any[] }){
  return [].concat(props.children)
}

export function use(...args: string[]){
  return args.filter(x => x).join(" ");
}

export function collect(
  acc: (add: (item: any) => void) => void){

  const sum: any[] = [];
  acc(sum.push.bind(sum));
  return sum;
}