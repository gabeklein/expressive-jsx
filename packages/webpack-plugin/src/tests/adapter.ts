import { transform } from '@babel/core';
import prettier from 'prettier';
import webpack, { Compilation, Compiler, Stats } from 'webpack';
import VirtualModulesPlugin from 'webpack-virtual-modules';

import JSXPlugin from '../';

// drop quotes from string snapshot
expect.addSnapshotSerializer({
  test: x => typeof x == "string",
  print: output => output as string
});

export async function bundle(
  input: Record<string, string> | string = ""){

  if(typeof input === 'string')
    input = { './input.jsx': input };
  
  const output: Record<string, string> = {};
  const entry = Object.keys(input)[0];
  const compiler = webpack({
    mode: 'development',
    devtool: false,
    entry,
    output: {
      filename: 'output.js'
    },
    externals({ request }, callback){
      if (/node_modules/.test(request!))
        return callback(null, 'commonjs ' + request);

      callback();
    },
    optimization: {
      runtimeChunk: false,
      splitChunks: false,
      concatenateModules: false,
      minimize: false,
    },
    experiments: {
      outputModule: true
    },
    plugins: [
      new JSXPlugin(),
      new TestSnapshotPlugin(output),
      new VirtualModulesPlugin(input),
    ],
    module: {
      rules: [
        {
          test: /\.css$/,
          use: 'css-loader'
        },
        {
          test: /\.jsx?$/,
          exclude: /node_modules/,
          use: {
            loader: "swc-loader",
            options: {
              jsc: {
                target: "es2020",
                parser: {
                  jsx: true
                },
                transform: {
                  react: {
                    development: false,
                    pragma: "element",
                  }
                }
              }
            }
          }
        }
      ]
    },
  });

  const stats = await new Promise<Stats>((res, rej) => {
    compiler.run((err, stats) => {
      if (err || !stats) {
        rej(err);
        return;
      }

      res(stats);
    });
  });

  return {
    files: output,
    output: output['output.js'],
    stats
  }
}

class TestSnapshotPlugin {
  constructor(private files: Record<string, string> = {}){}

  apply(compiler: Compiler): void {
    // do not actually write any files to the filesystem
    compiler.hooks.shouldEmit.tap('PreventEmitPlugin', () => false);

    // intercept the output and store it in `files` after format
    compiler.hooks.compilation.tap('OutputPlugin', (compilation) => {
      compilation.hooks.processAssets.tapAsync(
        {
          name: 'OutputPlugin',
          stage: Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE,
        },
        (assets, callback) => {
          Object.entries(assets).forEach(([assetName, source]) => {
            this.files[assetName] = pretty(
              source.source().toString()
            );
          });

          callback();
        }
      );
    });
  }
}

function pretty(code: string){
  const result = transform(code, {
    comments: false,
    plugins: [{
      visitor: {
        Identifier({ node }) {
          node.name = node.name.replace(/\w+?__WEBPACK_IMPORTED_/, "");
        },
        StringLiteral({ node }){
          node.value = node.value.replace(/^.+\/node_modules\//, "");
        }
      }
    }]
  })
  
  if(result)
    code = result.code!;

  return prettier.format(code, {
    parser: 'babel',
    trailingComma: 'none',
    jsxBracketSameLine: true,
    printWidth: 80,
    singleQuote: true
  });
}