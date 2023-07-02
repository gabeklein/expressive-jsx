declare namespace ExpressivePlugin {
  interface Options {
    macros?: string[];
  } 
}

declare class ExpressivePlugin {
    constructor(options?: ExpressivePlugin.Options);
    apply(compiler: any): void;
}

export = ExpressivePlugin;