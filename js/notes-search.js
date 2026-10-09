(() => {
  const controls = document.querySelector('.notes-search');
  if (!controls) return;
  const input = document.querySelector('#notes-query');
  const clear = document.querySelector('#notes-clear');
  const status = document.querySelector('#notes-search-status');
  const results = document.querySelector('#notes-search-results');
  const listing = document.querySelector('#notes-all');
  const normalize = text => text.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim();
  let indexPromise;
  let revision = 0;
  controls.hidden = false;
  const getIndex = () => indexPromise ||= fetch(controls.dataset.indexUrl)
    .then(response => { if (!response.ok) throw Error('Index unavailable'); return response.json(); })
    .catch(error => { indexPromise = null; throw error; });
  function appendHighlighted(parent, text, terms) {
    // Keep source text as text nodes: article content is never inserted as HTML.
    const lower = normalize(text);
    const matches = terms.flatMap(term => {
      const found = []; let position = 0;
      while ((position = lower.indexOf(term, position)) !== -1) {
        found.push([position, position + term.length]); position += term.length;
      }
      return found;
    }).sort((a, b) => a[0] - b[0]);
    let cursor = 0;
    for (const [start, end] of matches) {
      if (start < cursor) continue;
      parent.append(document.createTextNode(text.slice(cursor, start)));
      const mark = document.createElement('mark'); mark.textContent = text.slice(start, end);
      parent.append(mark); cursor = end;
    }
    parent.append(document.createTextNode(text.slice(cursor)));
  }
  async function update() {
    const version = ++revision;
    const query = normalize(input.value);
    results.replaceChildren();
    if (!query) { results.hidden = true; listing.hidden = false; status.textContent = ''; return; }
    status.textContent = '正在搜索…';
    try {
      const index = await getIndex();
      if (version !== revision) return;
      const terms = [...new Set(query.split(' '))];
      const matches = index.filter(item => terms.every(term => normalize(item.title + ' ' + item.text).includes(term)))
        .sort((a,b) => Number(terms.every(t => normalize(b.title).includes(t))) - Number(terms.every(t => normalize(a.title).includes(t))) || a.order - b.order);
      for (const item of matches) {
        const li = document.createElement('li');
        const heading = document.createElement('h2');
        const link = document.createElement('a'); link.href = item.url;
        appendHighlighted(link, item.title, terms); heading.append(link); li.append(heading);
        const text = item.text.replace(/\s+/g, ' ').trim();
        const positions = terms.map(t => normalize(text).indexOf(t)).filter(p => p >= 0);
        const start = Math.max(0, (positions.length ? Math.min(...positions) : 0) - 50);
        const excerpt = (start ? '…' : '') + text.slice(start, start + 190) + (start + 190 < text.length ? '…' : '');
        const paragraph = document.createElement('p'); appendHighlighted(paragraph, excerpt, terms);
        li.append(paragraph); results.append(li);
      }
      listing.hidden = true; results.hidden = false;
      status.textContent = matches.length ? `找到 ${matches.length} 篇笔记` : '没有匹配的笔记，试试其他关键词。';
    } catch {
      if (version !== revision) return;
      listing.hidden = false; results.hidden = true;
      status.textContent = '搜索暂时不可用，请重试或浏览下方笔记。';
    }
  }
  input.addEventListener('input', update);
  clear.addEventListener('click', () => { input.value = ''; input.focus(); update(); });
})();
