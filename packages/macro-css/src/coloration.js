import { rgba, hsla } from './colors';

export function bg(a){
  if(Array.isArray(a)){
    let style = {};

    const [ head, ...tail ] = a;

    switch(head){
      case "rgb":
      case "rgba": {
        const { value } = rgba(...tail);
        style = { backgroundColor: value };
        break;
      }

      case "hsl":
      case "hsla": {
        const { value } = hsla(...tail);
        style = { backgroundColor: value };
        break;
      }
    }

    return { style }
  }

  return {
    attrs: {
      background: Array.from(arguments)
    }
  }
}