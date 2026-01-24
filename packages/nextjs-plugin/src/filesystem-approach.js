const JSXPreset = require("@expressive/babel-preset");
const path = require("path");
const fs = require("fs");

function withExpressiveJSX(pluginOptions = {}) {
  return (nextConfig = {}) => {
    const {
      enableCSSModules = true,
      cssOutputDir = "styles/expressive",
      ...presetOptions
    } = pluginOptions;

    // Ensure CSS output directory exists
    const cssDir = path.join(process.cwd(), cssOutputDir);
    if (enableCSSModules && !fs.existsSync(cssDir)) {
      fs.mkdirSync(cssDir, { recursive: true });
    }

    return {
      ...nextConfig,
      
      // Configure Turbopack (Next.js 15+)
      turbopack: {
        ...(nextConfig.turbopack || {}),
        rules: {
          ...(nextConfig.turbopack?.rules || {}),
          '*.jsx': {
            loaders: [
              {
                loader: 'babel-loader',
                options: {
                  presets: [
                    [
                      JSXPreset,
                      {
                        ...presetOptions,
                        cssOutputDir: enableCSSModules ? cssDir : undefined,
                      },
                    ],
                  ],
                  plugins: enableCSSModules ? [
                    [
                      function() {
                        return {
                          name: "expressive-css-writer",
                          post(file) {
                            const { metadata } = file;
                            const { css, cssHash } = metadata || {};
                            
                            if (!css || !cssHash) return;
                            
                            // Write CSS to file system
                            const filename = `${path.basename(file.opts.filename, '.jsx')}.${cssHash}.module.css`;
                            const cssFilePath = path.join(cssDir, filename);
                            
                            fs.writeFileSync(cssFilePath, css);
                            
                            // Inject import at the top of the transformed file
                            file.path.unshiftContainer('body', 
                              file.types.importDeclaration(
                                [],
                                file.types.stringLiteral(`./${cssOutputDir}/${filename}`)
                              )
                            );
                          },
                        };
                      },
                    ],
                  ] : [],
                },
              },
            ],
            as: '*.js',
          },
        },
      },

      // Webpack fallback remains the same...
      webpack: (config, options) => {
        if (typeof nextConfig.webpack === 'function') {
          config = nextConfig.webpack(config, options);
        }

        config.module.rules.push({
          test: /\.jsx$/,
          exclude: /node_modules/,
          use: [
            {
              loader: 'babel-loader',
              options: {
                presets: [[JSXPreset, presetOptions]],
                // Webpack version can still use virtual modules if available
              },
            },
          ],
        });

        return config;
      },

      pageExtensions: [
        ...(nextConfig.pageExtensions || ['tsx', 'ts', 'jsx', 'js']),
      ].filter((ext, index, arr) => arr.indexOf(ext) === index),
    };
  };
}

module.exports = withExpressiveJSX;
