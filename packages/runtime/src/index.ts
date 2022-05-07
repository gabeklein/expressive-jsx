import { RuntimeStyle } from "./styles";

const CSS_MODULES = new Map<string, RuntimeStyle>();

export default function css(
  stylesheet: string,
  options: RuntimeStyle.PutOptions = {}){

  const { module: name = "" } = options;

  let group = CSS_MODULES.get(name);

  if(!group){
    group = new RuntimeStyle(name);
    CSS_MODULES.set(name, group);

    document.body.appendChild(group.styleElement);
  }

  group.put(stylesheet, options.refreshToken);
}

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