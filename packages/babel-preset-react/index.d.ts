import { Options } from "@expressive/babel-plugin-jsx";

export { Options };

declare const preset: (babel: any, options: Options) => {
  plugins: any[];
};

export default preset;