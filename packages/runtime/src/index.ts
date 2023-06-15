import { RuntimeStyle } from "./styles";

const CSS_MODULES = new Map<string, RuntimeStyle>();

export default function css(
  stylesheet: string,
  options: RuntimeStyle.PutOptions = {}){

  const { module: name = "" } = options;
  const { body } = window.document;

  let group = CSS_MODULES.get(name);

  if(!group){
    group = new RuntimeStyle(name);

    if(name && CSS_MODULES.size){
      const value = Array.from(CSS_MODULES.values()).at(-1)!;

      body.insertBefore(group.styleElement, value.styleElement);
    }
    else
      body.appendChild(group.styleElement);

    CSS_MODULES.set(name, group);
  }

  group.put(stylesheet, options.refreshToken);
}

export function classNames(...args: string[]){
  return args.filter(x => x).join(" ");
}

export function collect(
  acc: (add: (item: any) => void) => void){

  const sum: any[] = [];
  acc(sum.push.bind(sum));
  return sum;
}