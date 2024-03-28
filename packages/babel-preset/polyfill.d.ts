// /** Sanitize className. Will filter and join arguments. */
export function classNames(...args: any[]): string;

/**
 * Simple accumulator. Invokes argument; returns array of all data supplied to `push()`. 
 * 
 * @param accumulator - Accumulator function.
 */
export function collect(accumulator: (item: any) => void): any[];