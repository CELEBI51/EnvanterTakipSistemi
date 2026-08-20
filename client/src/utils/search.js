// Turkish users may omit accents while searching (e.g. "canta" for "çanta").
// Return the typed term plus its common Turkish-accent variants so the API can
// match either spelling without changing the stored data or the UI.
export function getSearchVariants(value) {
  const input = String(value || '').trim();
  if (!input) return [];

  const variants = new Set([input]);
  const substitutions = {
    c: ['ç'],
    ç: ['c'],
    s: ['ş'],
    ş: ['s'],
    g: ['ğ'],
    ğ: ['g'],
    o: ['ö'],
    ö: ['o'],
    u: ['ü'],
    ü: ['u'],
    i: ['ı'],
    ı: ['i'],
  };

  // Expand only a bounded number of combinations to keep requests small.
  let pending = [input];
  while (pending.length && variants.size < 32) {
    const current = pending.shift();
    [...current].forEach((character, index) => {
      const replacements = substitutions[character.toLocaleLowerCase('tr-TR')] || [];
      replacements.forEach((replacement) => {
        const next = `${current.slice(0, index)}${replacement}${current.slice(index + 1)}`;
        if (!variants.has(next) && variants.size < 32) {
          variants.add(next);
          pending.push(next);
        }
      });
    });
  }

  // PostgreSQL's Turkish case-insensitive matching in this database is
  // reliable for uppercase Turkish characters (e.g. `ÇAN`), but not always
  // for lowercase `çan`. Include Turkish-uppercase forms as well.
  [...variants].forEach((variant) => {
    if (variants.size < 64) {
      variants.add(variant.toLocaleUpperCase('tr-TR'));
    }
  });

  return [...variants];
}
