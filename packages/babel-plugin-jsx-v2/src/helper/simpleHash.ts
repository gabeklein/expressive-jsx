export function simpleHash(
  input: string = String(Math.random()),
  length = 3){

  let hash = 0;
  if (input.length === 0) return '';

  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash &= hash; // Convert to 32bit integer
  }

  // Convert the hash to a base36 string
  return Math.abs(hash).toString(36).substring(0, length);
}