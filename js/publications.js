(() => {
  const controls = document.querySelector('.filters');
  if (!controls) return;
  controls.hidden = false;
  const search = document.querySelector('#paper-search');
  const year = document.querySelector('#paper-year');
  const role = document.querySelector('#paper-role');
  const topic = document.querySelector('#paper-topic');
  const normalize = value => value.normalize('NFKD').replace(/\p{M}/gu, '')
    .toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/g, ' ');
  const compact = value => normalize(value).replace(/ /g, '');
  const journals = [
    ['cpl', 'chin phys lett', 'chinese physics letters'],
    ['cpb', 'chin phys b', 'chinese physics b'],
    ['prb', 'phys rev b', 'physical review b'],
    ['prl', 'phys rev lett', 'physical review letters'],
    ['prr', 'pr research', 'phys rev research', 'physical review research'],
    ['comm phys', 'communications physics'],
    ['jpcm', 'j phys condens matter', 'journal of physics condensed matter'],
    ['pnas', 'proceedings of the national academy of sciences']
  ];
  const journalQueries = new Map(journals.flatMap(([id, ...aliases]) =>
    [id, ...aliases].map(alias => [compact(alias), id])));
  // Romanized given names may join multiple pinyin syllables (e.g. Gaopei).
  // Keep ordinary word initials too; never alter the displayed author names.
  const syllables = new Set(`a ai an ang ao ba bai ban bang bao bei ben beng bi bian biao bie bin bing bo bu
    ca cai can cang cao ce cen ceng cha chai chan chang chao che chen cheng chi chong chou chu chua chuai chuan chuang chui chun chuo ci cong cou cu cuan cui cun cuo
    da dai dan dang dao de dei den deng di dia dian diao die ding diu dong dou du duan dui dun duo
    e ei en eng er fa fan fang fei fen feng fo fou fu
    ga gai gan gang gao ge gei gen geng gong gou gu gua guai guan guang gui gun guo
    ha hai han hang hao he hei hen heng hong hou hu hua huai huan huang hui hun huo
    ji jia jian jiang jiao jie jin jing jiong jiu ju juan jue jun
    ka kai kan kang kao ke ken keng kong kou ku kua kuai kuan kuang kui kun kuo
    la lai lan lang lao le lei leng li lia lian liang liao lie lin ling liu long lou lu luan lun luo lv lve
    ma mai man mang mao me mei men meng mi mian miao mie min ming miu mo mou mu
    na nai nan nang nao ne nei nen neng ni nian niang niao nie nin ning niu nong nou nu nuan nuo nv nve
    o ou pa pai pan pang pao pei pen peng pi pian piao pie pin ping po pou pu
    qi qia qian qiang qiao qie qin qing qiong qiu qu quan que qun
    ran rang rao re ren reng ri rong rou ru ruan rui run ruo
    sa sai san sang sao se sen seng sha shai shan shang shao she shei shen sheng shi shou shu shua shuai shuan shuang shui shun shuo si song sou su suan sui sun suo
    ta tai tan tang tao te teng ti tian tiao tie ting tong tou tu tuan tui tun tuo
    wa wai wan wang wei wen weng wo wu xi xia xian xiang xiao xie xin xing xiong xiu xu xuan xue xun
    ya yan yang yao ye yi yin ying yo yong you yu yuan yue yun
    za zai zan zang zao ze zei zen zeng zha zhai zhan zhang zhao zhe zhei zhen zheng zhi zhong zhou zhu zhua zhuai zhuan zhuang zhui zhun zhuo zi zong zou zu zuan zui zun zuo`.split(/\s+/));
  const initialCache = new Map();
  function initialsForWord(word) {
    if (initialCache.has(word)) return initialCache.get(word);
    // Chinese given names generally have one or two syllables. Preserve all
    // valid splits rather than imposing one possibly incorrect pronunciation.
    const choices = new Set([word[0]]);
    for (let i = 1; i < word.length; i++) {
      if (syllables.has(word.slice(0, i)) && syllables.has(word.slice(i))) {
        choices.add(word[0] + word[i]);
      }
    }
    const result = [...choices];
    initialCache.set(word, result);
    return result;
  }
  function authorAliases(author) {
    const words = normalize(author).split(' ').filter(Boolean);
    if (!words.length) return [];
    const surname = words.at(-1);
    const given = words.slice(0, -1);
    const aliases = new Set([words.join(''), surname + given.join('')]);
    let initials = [''];
    for (const word of given) {
      initials = [...new Set(initials.flatMap(prefix => initialsForWord(word).map(part => prefix + part)))];
    }
    for (const initial of initials) {
      aliases.add(initial + surname);
      aliases.add(surname + initial);
      aliases.add(initial + surname[0]);
      aliases.add(surname[0] + initial);
    }
    return [...aliases];
  }
  const papers = [...document.querySelectorAll('[data-paper]')].map(element => {
    const references = normalize(element.dataset.references || '');
    const journalIds = journals.filter(aliases => aliases.some(alias =>
      (` ${references} `).includes(` ${normalize(alias)} `))).map(([id]) => id);
    const authors = (element.dataset.authors || '').split(/,|\band\b/i).flatMap(authorAliases);
    return { element, journalIds, authors,
      text: normalize(`${element.textContent} ${element.dataset.alternateTitles || ''}`) };
  });
  function update() {
    const query = normalize(search.value);
    const nameQuery = compact(search.value);
    const journal = journalQueries.get(nameQuery);
    let count = 0;
    papers.forEach(({ element, journalIds, authors, text }) => {
      const textMatch = journal ? journalIds.includes(journal)
        : !query || text.includes(query) || authors.includes(nameQuery);
      const matches = (!year.value || element.dataset.year === year.value)
        && (!role.value || element.dataset.role === role.value)
        && (!topic?.value || (element.dataset.topics || '').split(' ').includes(topic.value)) && textMatch;
      element.hidden = !matches;
      if (matches) count++;
    });
    document.querySelector('#paper-count').textContent = `${count} of ${papers.length} publications`;
    document.querySelector('#no-results').hidden = count !== 0;
  }
  search.addEventListener('input', update);
  year.addEventListener('change', update);
  role.addEventListener('change', update);
  topic?.addEventListener('change', update);
})();
