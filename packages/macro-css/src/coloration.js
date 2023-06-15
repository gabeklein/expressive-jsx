import { rgba, hsla } from './colors';

export function bg(a){
  if(Array.isArray(a)){
    let attrs = {};

    const [ head, ...tail ] = a;

    switch(head){
      case "rgb":
      case "rgba": {
        const { value } = rgba(...tail);
        attrs = { backgroundColor: value };
        break;
      }

      case "hsl":
      case "hsla": {
        const { value } = hsla(...tail);
        attrs = { backgroundColor: value };
        break;
      }
    }

    return {
      style: attrs
    }
  }

  return {
    attrs: {
      background: this.arguments
    }
  }
}