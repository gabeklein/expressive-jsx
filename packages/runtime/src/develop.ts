const { version } = require("../package.json");

let dev = false;

try {
  if(process.env.NODE_ENV === "development")
    dev = true;
}
catch(err){}

export { dev, version }