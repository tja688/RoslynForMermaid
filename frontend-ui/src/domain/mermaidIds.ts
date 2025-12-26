const OFFSET_BASIS = 0xcbf29ce484222325n;
const FNV_PRIME = 0x100000001b3n;
const MASK_64 = 0xffffffffffffffffn;
const ID_REGEX = /[FN][0-9A-F]{16}/gi;

const toHex = (value: bigint) => value.toString(16).toUpperCase().padStart(16, '0');

const fnv1a64 = (input: string) => {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(input);
  let hash = OFFSET_BASIS;
  for (const byte of bytes) {
    hash ^= BigInt(byte);
    hash = (hash * FNV_PRIME) & MASK_64;
  }
  return hash;
};

const buildId = (prefix: 'F' | 'N', source: string) => {
  const text = source?.trim() ? source : 'unknown';
  return `${prefix}${toHex(fnv1a64(text))}`;
};

export const featureId = (featureKey: string) => buildId('F', featureKey);

export const nodeId = (nodeIdValue: string) => buildId('N', nodeIdValue);

export const extractMermaidIds = (text: string | null | undefined) => {
  if (!text) return [];
  const matches = text.match(ID_REGEX);
  return matches ? matches.map((id) => id.toUpperCase()) : [];
};
