import { rgba, hsla } from './colors';

export function bg(a){
  if(Array.isArray(a)){
    const [ head, ...tail ] = a;

    switch(head){
      case "rgb":
      case "rgba": {
        const { value } = rgba(...tail);
        return {
          backgroundColor: value
        };
      }

      case "hsl":
      case "hsla": {
        const { value } = hsla(...tail);
        return {
          backgroundColor: value
        };
      }
    }
  }

  return {
    background: Array.from(arguments)
  }
}