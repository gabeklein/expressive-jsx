import { basename, dirname, sep as separator } from 'path';

import type { Hub } from '@babel/traverse';

export function getLocalFilename(hub: Hub){
  const url = (hub as any).file.opts.filename as string;
  const [ base ] = basename(url).split(".");

  if(base !== "index")
    return base;

  return dirname(url).split(separator).pop()!;
}