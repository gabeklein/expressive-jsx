import typescript from 'rollup-plugin-typescript2';
import commonjs from 'rollup-plugin-commonjs'

export default {
  input: './src/index.ts',
  output: {
    file: 'lib/index.js',
    format: 'cjs'
  },
  external: [ "@babel/types", "@expressive/babel-plugin-core", "crypto", "path" ],
  plugins: [
    typescript(),
    commonjs()
  ],
  onwarn: (message, warn) => {
    if(message.code !== "CIRCULAR_DEPENDENCY")
      warn(message);
  }
}