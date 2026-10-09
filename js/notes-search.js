(() => {
  const controls = document.querySelector('.notes-search');
  if (!controls) return;
  const input = document.querySelector('#notes-query');
  const clear = document.querySelector('#notes-clear');
  const status = document.querySelector('#notes-search-status');
  const results = document.querySelector('#notes-search-results');
  const listing = document.querySelector('#notes-all');
  const normalize = text => text.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim();
  const segmenter = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null;
  function indexedText(text) {
    // Unicode folding can change length (e.g. … -> ...). Retain original UTF-16 spans.
    const segments = segmenter ? segmenter.segment(text)
      : [...text.matchAll(/[^\p{M}]\p{M}*|\p{M}+/gu)].map(match => ({ segment: match[0], index: match.index }));
    const pieces = [], starts = [], ends = [];
    for (const { segment, index } of segments) {
      const folded = segment.normalize('NFKC');
      pieces.push(folded);
      const length = folded.toLowerCase().length;
      for (let i = 0; i < length; i++) { starts.push(index); ends.push(index + segment.length); }
    }
    return { value: pieces.join('').toLowerCase(), starts, ends };
  }
  let indexPromise;
  let revision = 0;
  controls.hidden = false;
  const getIndex = () => indexPromise ||= fetch(controls.dataset.indexUrl)
    .then(response => { if (!response.ok) throw Error('Index unavailable'); return response.json(); })
    .catch(error => { indexPromise = null; throw error; });
  function appendHighlighted(parent, text, terms) {
    // Keep source text as text nodes: article content is never inserted as HTML.
    const folded = indexedText(text);
    const matches = terms.flatMap(term => {
      const found = []; let position = 0;
      while ((position = folded.value.indexOf(term, position)) !== -1) {
        found.push([folded.starts[position], folded.ends[position + term.length - 1]]); position += term.length;
      }
      return found;
    }).sort((a, b) => a[0] - b[0]);
    const ranges = [];
    for (const [start, end] of matches) {
      const previous = ranges.at(-1);
      if (previous && start <= previous[1]) previous[1] = Math.max(previous[1], end);
      else ranges.push([start, end]);
    }
    let cursor = 0;
    for (const [start, end] of ranges) {
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
        const folded = indexedText(text);
        const positions = terms.map(t => folded.value.indexOf(t)).filter(p => p >= 0).map(p => folded.starts[p]);
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
