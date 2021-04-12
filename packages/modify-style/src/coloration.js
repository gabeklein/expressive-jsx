import { rgba, hsla } from "./colors";

export function bg(a){
  const { URL_IMAGES } = process.env;
  let output;

  if(Array.isArray(a)){
    const [ head, ...tail ] = a;
    const dir = URL_IMAGES || "";
    switch(head){
      case "url":
        output = {
          backgroundImage: `url(${dir + tail[1]})`
        };
        break;

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