import { Transformer } from '@parcel/plugin';
import { MutableAsset, TransformerResult } from '@parcel/types';
import { basename } from 'path';

import { transform } from './transform';

export default new Transformer({
  async transform({ asset }) {
    const output = [asset as TransformerResult | MutableAsset];

    if (!asset.filePath.endsWith('.jsx'))
      return output;

    const id = asset.filePath;
    const code = await asset.getCode();
    const result = await transform(id, code);
    
    if (result && result.css) {
      const cssFilePath = `${asset.filePath}.css`;

      asset.addDependency({
        specifier: cssFilePath,
        specifierType: 'esm',
      });

      result.code += `\nimport './${basename(cssFilePath)}';\n`;
      
      output.push({
        type: 'css',
        content: result.css,
        sideEffects: true,
        uniqueKey: cssFilePath,
      })
    }

    asset.setCode(result.code);

    // if (result.map)
    //   asset.setMap(result.map as any);

    return output;
  }
});