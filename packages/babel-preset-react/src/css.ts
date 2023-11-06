import { ModifyDelegate } from "@expressive/babel-plugin-jsx";

export function addStyle(this: ModifyDelegate, ...args: any[]){
  this.addStyle(this.name, ...args);
}