import sanitizeHtml from 'sanitize-html';

// Layer 1 of 2: strip anything executable before saving.
// Layer 2 is the sandboxed iframe + CSP in lib/profileDocument.js.
export function cleanProfileHtml(html) {
  return sanitizeHtml(html ?? '', {
    allowedTags: [
      ...sanitizeHtml.defaults.allowedTags,
      'img', 'center', 'font', 'marquee', 'span', 'div', 'u', 's', 'big', 'small',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'table', 'thead', 'tbody', 'tr', 'td', 'th',
    ],
    allowedAttributes: {
      '*': ['class', 'id', 'style', 'title', 'align'],
      a: ['href', 'name', 'target'],
      img: ['src', 'alt', 'width', 'height'],
      font: ['color', 'face', 'size'],
      marquee: ['direction', 'behavior', 'scrollamount'],
      td: ['colspan', 'rowspan', 'width'],
      th: ['colspan', 'rowspan', 'width'],
      table: ['width', 'cellpadding', 'cellspacing', 'border'],
    },
    allowedSchemes: ['http', 'https', 'data'],
    allowedSchemesByTag: { a: ['http', 'https', 'mailto'] },
  }).slice(0, 50_000);
}

export function cleanProfileCss(css) {
  return (css ?? '')
    .replace(/<\/?style/gi, '')    // can't break out of the <style> tag
    .replace(/@import/gi, '')      // no pulling in outside stylesheets
    .replace(/expression\s*\(/gi, '')
    .slice(0, 50_000);
}
