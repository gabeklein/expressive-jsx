import { rgba, hsla } from './colors';

export function bg(a){
  let output;

  if(Array.isArray(a)){
    const [ head, ...tail ] = a;

    switch(head){
      case "rgb":
      case "rgba": {
        const { value } = rgba(...tail);
        output = { backgroundColor: value };
        break;
      }

      case "hsl":
      case "hsla": {
        const { value } = hsla(...tail);
        output = { backgroundColor: value };
        break;
      }
    }
  }
  else {
    output = {
      background: a
    }
  }

  return {
    style: output
  }
}