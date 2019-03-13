import typescript from 'rollup-plugin-typescript2';
import commonjs from 'rollup-plugin-commonjs'

export default {
  input: './src/index.ts',
  output: {
    file: 'index.js',
    format: 'cjs',
    exports: "named"
  },
  external: [ "@babel/types" ],
  plugins: [
    typescript(),
    commonjs()
  ],
  onwarn: (message, warn) => {
    if(message.code !== "CIRCULAR_DEPENDENCY")
      warn(message);
  }
}