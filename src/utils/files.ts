import type { APIAttachment } from 'discord-api-types/v10';

export type AttachmentKind = 'audio' | 'video' | 'image' | 'file';

export function attachmentKind(attachment: Pick<APIAttachment, 'content_type'>): AttachmentKind {
  const type = attachment.content_type?.split('/')[0];
  return type === 'audio' || type === 'video' || type === 'image' ? type : 'file';
}

const LANGUAGES = new Map([
  ['text/html', 'html'],
  ['text/css', 'css'],
  ['text/javascript', 'javascript'],
  ['application/javascript', 'javascript'],
  ['application/json', 'json'],
  ['application/xml', 'xml'],
  ['image/svg+xml', 'svg'],
  ['application/xhtml+xml', 'xhtml'],
  ['text/markdown', 'markdown'],
  ['text/x-sass', 'sass'],
  ['text/x-scss', 'scss'],
  ['text/x-python', 'python'],
  ['application/x-python-code', 'python'],
  ['text/x-java-source', 'java'],
  ['text/x-csharp', 'csharp'],
  ['text/x-php', 'php'],
  ['application/x-php', 'php'],
  ['text/x-ruby', 'ruby'],
  ['text/x-go', 'go'],
  ['text/x-rustsrc', 'rust'],
  ['text/x-kotlin', 'kotlin'],
  ['text/x-swift', 'swift'],
  ['text/x-dart', 'dart'],
  ['text/x-lua', 'lua'],
  ['text/x-scala', 'scala'],
  ['application/sql', 'sql'],
  ['text/x-sh', 'bash'],
  ['application/x-sh', 'bash'],
  ['text/x-objectivec', 'objectivec'],
  ['text/x-perl', 'perl'],
  ['text/x-pascal', 'pascal'],
  ['text/x-dsrc', 'd'],
  ['text/x-groovy', 'groovy'],
  ['text/x-rsrc', 'r'],
  ['text/x-vb', 'vbnet'],
  ['text/x-solidity', 'solidity'],
  ['text/x-julia', 'julia'],
  ['text/x-clojure', 'clojure'],
  ['application/graphql', 'graphql'],
  ['application/x-yaml', 'yaml'],
  ['text/x-ini', 'ini'],
  ['text/plain', 'plaintext'],
  ['text/uri-list', 'uri'],
  ['application/diff', 'diff'],
  ['text/x-dockerfile', 'dockerfile'],
]);

/** The highlight language for a text attachment, or undefined when it is not previewable text. */
export function attachmentLanguage(attachment: Pick<APIAttachment, 'content_type'>): string | undefined {
  const mime = attachment.content_type?.split(';')[0]?.trim();
  return mime ? LANGUAGES.get(mime) : undefined;
}

export function formatBytes(bytes: number, decimals = 2): { size: number; unit: string } {
  if (!bytes) return { size: 0, unit: 'Bytes' };

  const units = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));

  return { size: parseFloat((bytes / 1024 ** i).toFixed(decimals)), unit: units[i]! };
}
