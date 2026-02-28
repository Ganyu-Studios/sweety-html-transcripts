import type { APIEmbedField } from 'discord-api-types/v10';

export function calculateInlineIndex(fields: APIEmbedField[], currentFieldIndex: number): number {
  const startIndex: number = currentFieldIndex - 1;

  for (let i: number = startIndex; i >= 0; i--) {
    const field: APIEmbedField = fields[i];
    if (!field) continue;

    if (field.inline === false) {
      const amount: number = startIndex - i;
      return (amount % 3) + 1;
    }
  }

  return (currentFieldIndex % 3) + 1;
}
