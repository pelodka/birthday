export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function escapeAttribute(value: string): string {
  return escapeHtml(value);
}

export function escapeCssUrl(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/'/g, "\\'").replace(/\n|\r|\f/g, '');
}

export function escapeCssValue(value: string): string {
  return value.replace(/[;"'<>\\{}]/g, '');
}

export function renderTextParagraphs(lines: readonly string[]): string {
  return lines.map((line) => `<p>${escapeHtml(line)}</p>`).join('');
}

export function renderEyebrow(label: string): string {
  return `<p class="eyebrow">${escapeHtml(label)}</p>`;
}
