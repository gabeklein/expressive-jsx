const JSXPreset = require("@expressive/babel-preset");
const path = require("path");

function withExpressiveJSX(pluginOptions = {}) {
  return (nextConfig = {}) => {
    const {
      enableCSSModules = true,
      cssModulePattern = "[name].[hash].module.css",
      ...presetOptions
    } = pluginOptions;

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
                        // For Turbopack, we'll need to handle CSS differently
                        // This is a simplified approach
                        cssModule: enableCSSModules ? cssModulePattern : undefined,
                      },
                    ],
                  ],
                },
              },
            ],
            as: '*.js',
          },
        },
      },

      // Fallback webpack configuration for older Next.js versions
      webpack: (config, options) => {
        const { isServer, dev } = options;

        // Apply existing webpack config if present
        if (typeof nextConfig.webpack === 'function') {
          config = nextConfig.webpack(config, options);
        }

        // Add rule for .jsx files
        config.module.rules.push({
          test: /\.jsx$/,
          exclude: /node_modules/,
          use: [
            {
              loader: 'babel-loader',
              options: {
                presets: [
                  [
                    JSXPreset,
                    {
                      ...presetOptions,
                      cssModule: enableCSSModules 
                        ? cssModulePattern.replace('[name]', '[name]')
                        : undefined,
                    },
                  ],
                ],
                plugins: enableCSSModules ? [
                  [
                    function() {
                      return {
                        post({ metadata }) {
                          const { css } = metadata || {};
                          if (!css) return;
                          
                          // In a real implementation, you'd need to handle
                          // CSS injection differently for webpack
                          // This is a placeholder for the concept
                          console.log('Generated CSS:', css);
                        },
                      };
                    },
                  ],
                ] : [],
              },
            },
          ],
        });

        return config;
      },

      // Ensure .jsx files are treated as page extensions
      pageExtensions: [
        ...(nextConfig.pageExtensions || ['tsx', 'ts', 'jsx', 'js']),
      ].filter((ext, index, arr) => arr.indexOf(ext) === index), // Remove duplicates
    };
  };
}

module.exports = withExpressiveJSX;
