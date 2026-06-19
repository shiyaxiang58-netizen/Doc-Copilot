const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
const STORAGE_KEY = 'doc-copilot-demo-v2';
const API_BASE = location.protocol === 'file:' ? 'http://localhost:3000' : '';

const escapeHTML = (value = '') => String(value).replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));
const uid = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`;
const deepCopy = (value) => JSON.parse(JSON.stringify(value));

function createAnalysis() {
  return {
    activeVersion: 'default',
    previousVersion: null,
    summaryVersions: {
      default: '生成式 AI 产品的核心不是堆叠模型能力，而是让技术与真实、高频的用户任务匹配，并通过可验证、可控制的交互建立信任。',
      concise: '先找到真实任务，再用可验证、可控制的 AI 体验解决它。',
      detailed: '设计生成式 AI 产品，应从真实且高频的用户任务出发，判断模型是否能带来显著效率提升；同时用原文引用、人工确认和反馈闭环管理不确定性，最终以任务完成率与用户采纳率验证价值。',
      practical: '先写清用户要完成的任务，再为每个 AI 结果补上来源、编辑和确认入口；最后用任务完成率、采纳率各验证一次。'
    },
    points: [
      { id: 'p1', title: '从用户任务出发，而不是模型能力', text: '优先识别高频、高摩擦的用户任务，再判断 AI 是否能带来数量级的效率提升。', sourceId: 'source-pdf', snippetId: 'pdf-05' },
      { id: 'p2', title: '把不确定性设计进产品', text: '通过来源引用、置信提示和人工确认节点，让用户理解并掌握 AI 的边界。', sourceId: 'source-web', snippetId: 'web-trust' },
      { id: 'p3', title: '建立输入—生成—反馈闭环', text: '持续吸收用户修改与偏好，让结果在协作中逐步变好。', sourceId: 'source-note', snippetId: 'note-loop' },
      { id: 'p4', title: '用评测保障核心体验', text: '同时关注准确性、任务完成率、响应速度和用户采纳率。', sourceId: 'source-pdf', snippetId: 'pdf-17' },
      { id: 'p5', title: 'Agent 的价值来自行动能力', text: '从给出答案走向拆解任务并使用工具完成目标，但每一步都应可观察、可中断。', sourceId: 'source-pdf', snippetId: 'pdf-21' }
    ],
    logic: [
      { step: '01', title: '发现机会', subtitle: '用户任务与场景' },
      { step: '02', title: '设计体验', subtitle: '协作、控制与信任' },
      { step: '03', title: '构建闭环', subtitle: '反馈与个性化' },
      { step: '04', title: '持续评测', subtitle: '质量与业务价值' }
    ],
    knowledge: [
      { title: '机会识别', items: ['用户任务', '价值判断', '场景选择'], color: 'violet' },
      { title: '体验设计', items: ['渐进式交互', '结果可控', '信任建立'], color: 'blue' },
      { title: '系统构建', items: ['Prompt 工作流', 'RAG 检索', 'Agent 工具'], color: 'orange' },
      { title: '效果评测', items: ['离线评测', '用户反馈', '业务指标'], color: 'green' }
    ],
    quizzes: [
      {
        id: 'quiz-1', type: 'choice', level: '理解题', question: '设计生成式 AI 产品时，为什么应该先从用户任务出发？',
        options: [
          { id: 'a', text: '因为模型能力通常不够稳定' },
          { id: 'b', text: '因为匹配真实高频任务，模型能力才能转化为用户价值' },
          { id: 'c', text: '因为用户比产品经理更了解技术' }
        ], correct: 'b', sourceId: 'source-pdf', snippetId: 'pdf-05'
      },
      {
        id: 'quiz-2', type: 'choice', level: '应用题', question: '如果 AI 输出准确，但用户采纳率很低，最应该优先检查什么？',
        options: [
          { id: 'a', text: '模型参数量是否足够大' },
          { id: 'b', text: '输出是否可理解、可验证并贴合工作流' },
          { id: 'c', text: '页面是否使用了更多动画' }
        ], correct: 'b', sourceId: 'source-web', snippetId: 'web-trust'
      },
      {
        id: 'quiz-3', type: 'short', level: '思考题', question: '请用一句话说明，你会怎样为 AI 输出建立用户信任？', sourceId: 'source-note', snippetId: 'note-loop'
      }
    ],
    actions: [
      { id: 'action-1', title: '用一句话描述产品解决的用户任务', meta: '3 分钟 · 产品定位' },
      { id: 'action-2', title: '列出任务中最让用户费力的 3 个环节', meta: '5 分钟 · 机会识别' },
      { id: 'action-3', title: '为一个 AI 输出增加来源与重新生成入口', meta: '15 分钟 · 信任设计' },
      { id: 'action-4', title: '定义 1 个质量指标和 1 个业务指标', meta: '8 分钟 · 效果评测' },
      { id: 'action-5', title: '找一位目标用户完成一次任务测试', meta: '30 分钟 · 用户验证' }
    ]
  };
}

function createSources() {
  return [
    {
      id: 'source-pdf', type: 'pdf', name: '生成式 AI 产品设计指南.pdf', meta: '24 页 · 3.8 MB',
      snippets: [
        { id: 'pdf-05', location: '第 5 页 · 用户任务分析', before: '判断一个 AI 产品机会时，不应先罗列模型可以完成的能力。', highlight: '技术能力只有与真实、高频且高摩擦的用户任务匹配，才能转化为稳定的产品价值。', after: '团队应先观察任务，再选择合适的技术路径。' },
        { id: 'pdf-17', location: '第 17 页 · 产品评测体系', before: '模型分数不能代表完整的产品体验。', highlight: '评测需要同时覆盖准确性、任务完成率、响应速度和用户采纳率。', after: '这些指标共同反映结果是否真正进入用户工作流。' },
        { id: 'pdf-21', location: '第 21 页 · Agent 工作流', before: 'Agent 将产品从回答问题推向完成任务。', highlight: '每一个自动执行步骤都应该可观察、可暂停，并允许用户接管。', after: '行动能力与控制能力必须一起设计。' }
      ]
    },
    {
      id: 'source-web', type: 'web', name: '可信 AI 交互设计模式', meta: 'example.com/design/trust',
      snippets: [{ id: 'web-trust', location: '网页段落 8 · 可信交互', before: '用户不会因为模型更复杂就自然信任结果。', highlight: '来源依据、结果可编辑性和关键节点确认，是建立信任的三个基础入口。', after: '产品需要让不确定性可见，而不是假装它不存在。' }]
    },
    {
      id: 'source-note', type: 'text', name: '访谈笔记：AI 助手使用反馈', meta: '1,286 字 · 个人笔记',
      snippets: [{ id: 'note-loop', location: '笔记段落 4 · 反馈闭环', before: '多数受访者会对第一次输出进行调整。', highlight: '当助手能记住修改方式并在下一次主动应用时，用户才感到它真正参与了协作。', after: '反馈不应只停留在点赞和点踩。' }]
    }
  ];
}

function createTask(id, title, age = '刚刚') {
  return {
    id, title, createdLabel: age, status: 'complete', activeTab: 'summary',
    description: '从多份资料中提炼可理解、可复习、可执行的学习成果。',
    sources: createSources(), analysis: createAnalysis(),
    progress: { quizAnswers: {}, shortAnswers: {}, completedActions: ['action-1'] },
    chat: [], contextId: null, realAnalysis: false
  };
}

function initialState() {
  const primary = createTask('task-ai-guide', '生成式 AI 产品设计指南', '刚刚');
  const second = createTask('task-agent-patterns', 'Agent 设计模式速读', '昨天');
  second.progress.completedActions = ['action-1', 'action-2'];
  return { view: 'workspace', currentTaskId: primary.id, tasks: [primary, second], libraryFilter: 'all' };
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved?.tasks?.length) {
      saved.tasks.forEach((task) => {
        task.chatPending = false;
        if (task.status === 'analyzing') {
          task.status = 'error';
          task.errorMessage = '上次分析被中断，请重新创建任务并上传资料。';
        }
      });
      return saved;
    }
  } catch (_) { /* Fall back to seed data. */ }
  return initialState();
}

let state = loadState();
let wizard = { step: 1, title: '', sources: [], sourceTab: 'pdf' };
let currentCitation = null;
let analysisTimers = [];
const pendingPayloads = new Map();

async function requestApi(path, body) {
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method: body ? 'POST' : 'GET',
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined
    });
  } catch (_) {
    throw new Error('无法连接 Doc Copilot 服务。请通过 http://localhost:3000 打开网页，并确认服务已启动。');
  }
  let payload = {};
  try { payload = await response.json(); } catch (_) { /* handled below */ }
  if (!response.ok) throw new Error(payload.error || `服务请求失败（${response.status}）。`);
  return payload;
}

async function checkHealth() {
  const status = $('#connectionStatus');
  try {
    const health = await requestApi('/api/health');
    status.textContent = health.configured ? `AI 已连接 · ${health.model}` : '服务已启动 · 等待配置 AI';
    status.classList.toggle('connected', health.configured);
  } catch (_) {
    status.textContent = '服务未启动 · 当前仅可浏览样例';
    status.classList.remove('connected');
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  const saved = $('#savedState');
  if (saved) {
    saved.textContent = '正在保存…';
    clearTimeout(saveState.timer);
    saveState.timer = setTimeout(() => { saved.textContent = '已保存到本机'; }, 350);
  }
}

function currentTask() { return state.tasks.find((task) => task.id === state.currentTaskId) || state.tasks[0]; }
function typeLabel(type) { return ({ pdf: 'PDF', web: '网页', text: '文本' })[type] || type; }
function sourceIcon(type) { return ({ pdf: 'PDF', web: 'WEB', text: 'TXT' })[type] || 'DOC'; }

function toast(message) {
  const el = $('#toast');
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove('show'), 1900);
}

function openModal(id) {
  const modal = $(`#${id}`);
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  setTimeout(() => $('.modal-close, input, button', modal)?.focus(), 30);
}

function closeModal(id) {
  const modal = $(`#${id}`);
  modal?.classList.remove('open');
  modal?.setAttribute('aria-hidden', 'true');
}

function updateChrome() {
  $('#taskCount').textContent = state.tasks.length;
  const remaining = state.tasks.reduce((sum, task) => sum + task.analysis.quizzes.filter((quiz) => !task.progress.quizAnswers[quiz.id] && !task.progress.shortAnswers[quiz.id]).length, 0);
  $('#reviewCount').textContent = remaining;
  $('#recentTasks').innerHTML = state.tasks.slice(0, 4).map((task) => {
    const source = task.sources[0] || { type: 'text' };
    return `<button class="recent-task ${task.id === state.currentTaskId ? 'selected' : ''}" data-open-task="${task.id}"><span class="file-icon ${source.type}">${sourceIcon(source.type)}</span><span><strong>${escapeHTML(task.title)}</strong><small>${task.createdLabel} · ${task.sources.length} 份资料</small></span></button>`;
  }).join('');
  $$('.nav-item').forEach((item) => item.classList.toggle('active', item.dataset.view === state.view));
  const task = currentTask();
  const titles = { workspace: task?.title || '学习工作台', library: '我的资料库', review: '复习中心' };
  $('#topbarTitle').textContent = titles[state.view];
  $$('.workspace-action').forEach((el) => el.hidden = state.view !== 'workspace' || !task || task.status !== 'complete');
}

function renderApp() {
  updateChrome();
  $$('.view').forEach((view) => view.classList.remove('active'));
  $(`#${state.view}View`).classList.add('active');
  if (state.view === 'workspace') { renderWorkspace(); renderAssistant(); }
  if (state.view === 'library') renderLibrary();
  if (state.view === 'review') renderReview();
}

function renderWorkspace() {
  const task = currentTask();
  if (!task) {
    $('#workspaceMain').innerHTML = `<div class="empty-state"><span>✦</span><h1>从一份资料开始</h1><p>添加 PDF、网页或笔记，助手会替你梳理重点。</p><button class="primary-button" id="emptyNewTask">新建学习任务</button></div>`;
    return;
  }
  if (task.status === 'analyzing') {
    renderAnalyzing(task);
    return;
  }
  if (task.status === 'error') {
    $('#workspaceMain').innerHTML = `
      <section class="analysis-error">
        <span class="error-orb">!</span><span class="eyebrow">分析没有完成</span>
        <h1>${escapeHTML(task.title)}</h1><p>${escapeHTML(task.errorMessage || '服务暂时不可用，请稍后重试。')}</p>
        <div><button class="primary-button" data-retry-analysis="${task.id}" ${pendingPayloads.has(task.id) ? '' : 'disabled'}>重新分析</button><button class="secondary-button" id="errorNewTask">重新添加资料</button></div>
        ${pendingPayloads.has(task.id) ? '' : '<small>页面刷新后不会保留原始文件内容，请重新添加资料。</small>'}
      </section>`;
    return;
  }
  const tabs = [
    ['summary', '概览总结'], ['knowledge', `知识结构 <span>${task.analysis.knowledge.length * 3}</span>`],
    ['quiz', `自测问答 <span>${task.analysis.quizzes.length}</span>`], ['actions', `行动清单 <span>${task.analysis.actions.length}</span>`]
  ];
  $('#workspaceMain').innerHTML = `
    <section class="document-hero">
      <div class="hero-status"><span>✦ ${task.realAnalysis ? 'AI 已完成真实分析' : '示例分析结果'}</span><i></i><span>${task.sources.length} 份资料交叉整理</span></div>
      <h1>${escapeHTML(task.title)}</h1><p>${escapeHTML(task.description)}</p>
      <div class="source-pills">${task.sources.map((source) => `<button data-open-source="${source.id}"><span class="mini-file ${source.type}">${sourceIcon(source.type)}</span>${escapeHTML(source.name)}<small>${escapeHTML(source.meta)}</small></button>`).join('')}</div>
    </section>
    <div class="tabs" role="tablist">${tabs.map(([id, label]) => `<button class="tab ${task.activeTab === id ? 'active' : ''}" data-tab="${id}">${label}</button>`).join('')}</div>
    <div class="tab-content">${renderTab(task)}</div>`;
}

function renderAnalyzing(task) {
  $('#workspaceMain').innerHTML = `
    <section class="analysis-screen">
      <div class="analysis-orb"><span>✦</span><i></i></div>
      <span class="eyebrow">AI 分析中</span><h1>正在读懂“${escapeHTML(task.title)}”</h1><p>正在提取并整理 ${task.sources.length} 份资料。处理时间取决于资料长度和模型速度。</p>
      <div class="analysis-steps">
        ${['读取资料与基础信息', '识别内容结构与主题', '提炼重点与原文依据', '生成问答与行动清单'].map((step, index) => `<div data-analysis-step="${index}"><span>${index + 1}</span><strong>${step}</strong><small>${index === 0 ? '进行中' : '等待中'}</small></div>`).join('')}
      </div>
      <div class="progress-track"><i id="analysisProgress"></i></div><small class="progress-note" id="progressNote">通常只需几秒</small>
    </section>`;
}

function renderTab(task) {
  if (task.activeTab === 'knowledge') return renderKnowledge(task);
  if (task.activeTab === 'quiz') return renderQuiz(task);
  if (task.activeTab === 'actions') return renderActions(task);
  return renderSummary(task);
}

function renderSummary(task) {
  const result = task.analysis;
  const leadCitation = result.points[0];
  const versionNames = { default: '标准版', concise: '更简短', detailed: '更详细', practical: '更实用' };
  return `
    <article class="card summary-card">
      <div class="card-header"><div><span class="section-icon purple">✦</span><span><h2>一句话读懂</h2><small>${versionNames[result.activeVersion]}总结</small></span></div><div class="card-actions"><button class="text-button" data-copy-summary>复制</button><button class="secondary-button small" id="regenerateBtn">重新生成</button></div></div>
      <p class="summary-lead">${escapeHTML(result.summaryVersions[result.activeVersion])}</p>
      <div class="summary-footer"><button class="citation-chip" data-citation="${leadCitation.sourceId}|${leadCitation.snippetId}"><span>01</span> 查看原文依据</button>${result.previousVersion ? `<button class="text-button" id="restoreSummary">↶ 恢复上一版</button>` : ''}</div>
    </article>
    <article class="card">
      <div class="card-header"><div><span class="section-icon">◎</span><span><h2>5 个关键要点</h2><small>跨 ${task.sources.length} 份资料综合提炼</small></span></div><span class="subtle">约 2 分钟读完</span></div>
      <ol class="key-points">${result.points.map((point, index) => `<li><span>${String(index + 1).padStart(2, '0')}</span><div><h3>${point.title}</h3><p>${point.text}</p><button class="inline-citation" data-citation="${point.sourceId}|${point.snippetId}">查看来源 ↗</button></div></li>`).join('')}</ol>
    </article>
    <article class="card">
      <div class="card-header"><div><span class="section-icon">⌘</span><span><h2>内容逻辑</h2><small>从问题发现到效果验证</small></span></div></div>
      <div class="logic-flow">${result.logic.map((item, index) => `<div><span>${item.step}</span><strong>${item.title}</strong><small>${item.subtitle}</small></div>${index < result.logic.length - 1 ? '<i>→</i>' : ''}`).join('')}</div>
    </article>`;
}

function renderKnowledge(task) {
  return `<article class="card knowledge-card">
    <div class="card-header"><div><span class="section-icon">◇</span><span><h2>跨资料知识结构</h2><small>把零散概念放回完整脉络</small></span></div><span class="subtle">12 个核心概念</span></div>
    <div class="knowledge-root"><small>核心主题</small><strong>${escapeHTML(task.title)}</strong></div>
    <div class="knowledge-grid">${task.analysis.knowledge.map((branch, index) => `<div class="knowledge-branch ${branch.color}"><b>0${index + 1}</b><h3>${branch.title}</h3>${branch.items.map((item) => `<span>${item}</span>`).join('')}</div>`).join('')}</div>
    <div class="insight-callout"><span>✦</span><p><strong>跨资料发现</strong>三份资料都将“用户控制感”视为信任建立的前提，但访谈笔记更强调助手需要记住用户修改。</p></div>
  </article>`;
}

function renderQuiz(task) {
  const answered = Object.keys(task.progress.quizAnswers).length + Object.keys(task.progress.shortAnswers).length;
  return `<section class="quiz-section">
    <article class="card quiz-overview"><div><span class="section-icon purple">?</span><span><h2>检验你的理解</h2><small>选择题即时反馈，简答题由模拟 AI 点评</small></span></div><div class="score"><strong>${answered}</strong><small>/${task.analysis.quizzes.length} 已完成</small></div></article>
    ${task.analysis.quizzes.map((quiz, index) => renderQuizCard(task, quiz, index)).join('')}
  </section>`;
}

function renderQuizCard(task, quiz, index) {
  const chosen = task.progress.quizAnswers[quiz.id];
  const short = task.progress.shortAnswers[quiz.id];
  if (quiz.type === 'short') {
    return `<article class="card quiz-card">
      <div class="quiz-meta"><span>${quiz.level} · ${index + 1}/${task.analysis.quizzes.length}</span><button data-citation="${quiz.sourceId}|${quiz.snippetId}">查看依据</button></div>
      <h3>${quiz.question}</h3>
      <textarea class="short-answer" data-short-id="${quiz.id}" placeholder="写下你的回答…" ${short ? 'disabled' : ''}>${escapeHTML(short?.text || '')}</textarea>
      <div class="short-actions">${short ? '<button class="text-button" data-retry-short="' + quiz.id + '">重新作答</button>' : '<button class="primary-button small" data-submit-short="' + quiz.id + '">提交给 AI 点评</button>'}</div>
      ${short ? `<div class="ai-feedback ${short.pending ? 'loading' : ''}"><span>✦</span><p>${short.pending ? 'AI 正在阅读并点评你的回答…' : escapeHTML(short.feedback || '回答已记录。')}</p></div>` : ''}
    </article>`;
  }
  return `<article class="card quiz-card">
    <div class="quiz-meta"><span>${quiz.level} · ${index + 1}/${task.analysis.quizzes.length}</span><button data-citation="${quiz.sourceId}|${quiz.snippetId}">查看依据</button></div>
    <h3>${quiz.question}</h3>
    <div class="options">${quiz.options.map((option) => {
      let cls = '';
      if (chosen) cls = option.id === quiz.correct ? 'correct' : option.id === chosen ? 'wrong' : '';
      return `<button class="option ${cls}" data-answer="${quiz.id}|${option.id}" ${chosen ? 'disabled' : ''}><b>${option.id.toUpperCase()}</b><span>${option.text}</span>${cls === 'correct' ? '<i>✓</i>' : cls === 'wrong' ? '<i>×</i>' : ''}</button>`;
    }).join('')}</div>
    ${chosen ? `<div class="answer-feedback ${chosen === quiz.correct ? 'correct' : 'wrong'}"><strong>${chosen === quiz.correct ? '回答正确' : '再想一步'}</strong><span>${chosen === quiz.correct ? '真实任务是模型能力转化为用户价值的入口。' : '技术只有进入真实、高频的任务，才会变成用户愿意使用的产品价值。'}</span><button class="text-button" data-retry-quiz="${quiz.id}">重新作答</button></div>` : ''}
  </article>`;
}

function renderActions(task) {
  const done = task.progress.completedActions;
  return `<article class="card">
    <div class="card-header"><div><span class="section-icon purple">✓</span><span><h2>读完后，试着这样做</h2><small>把知识迁移到真实任务</small></span></div><span class="progress-label"><b>${done.length}</b>/${task.analysis.actions.length} 已完成</span></div>
    <div class="action-progress"><i style="width:${done.length / task.analysis.actions.length * 100}%"></i></div>
    <div class="action-list">${task.analysis.actions.map((action) => `<label class="action-item ${done.includes(action.id) ? 'done' : ''}"><input type="checkbox" data-action-id="${action.id}" ${done.includes(action.id) ? 'checked' : ''}><span></span><div><strong>${action.title}</strong><small>${action.meta}</small></div></label>`).join('')}</div>
  </article>`;
}

function renderLibrary() {
  const filtered = state.tasks.filter((task) => state.libraryFilter === 'all' || task.sources.some((source) => source.type === state.libraryFilter));
  $('#libraryContent').innerHTML = `
    <div class="page-heading"><div><span class="eyebrow">我的资料库</span><h1>所有学习任务，都在这里</h1><p>重新打开总结，或按资料类型找到之前处理的内容。</p></div><button class="primary-button" id="libraryNewTask">＋ 新建任务</button></div>
    <div class="library-toolbar"><div class="filter-tabs">${[['all', '全部'], ['pdf', 'PDF'], ['web', '网页'], ['text', '文本']].map(([id, label]) => `<button class="${state.libraryFilter === id ? 'active' : ''}" data-library-filter="${id}">${label}</button>`).join('')}</div><span>共 ${filtered.length} 个任务</span></div>
    <div class="task-grid">${filtered.map((task) => {
      const quizDone = Object.keys(task.progress.quizAnswers).length + Object.keys(task.progress.shortAnswers).length;
      const progress = Math.round((quizDone + task.progress.completedActions.length) / (task.analysis.quizzes.length + task.analysis.actions.length) * 100);
      return `<article class="task-card" data-open-task="${task.id}"><div class="task-card-top"><span class="task-status">✓ 已分析</span><button class="icon-button" aria-label="更多">···</button></div><h2>${escapeHTML(task.title)}</h2><p>${escapeHTML(task.description)}</p><div class="task-source-row">${task.sources.map((source) => `<span class="mini-file ${source.type}">${sourceIcon(source.type)}</span>`).join('')}<small>${task.sources.length} 份资料 · ${task.createdLabel}</small></div><div class="task-progress"><span><i style="width:${progress}%"></i></span><small>${progress}% 学习进度</small></div></article>`;
    }).join('') || '<div class="empty-filter">这个分类里还没有任务。</div>'}</div>`;
}

function renderReview() {
  const rows = [];
  state.tasks.forEach((task) => task.analysis.quizzes.forEach((quiz) => {
    const done = task.progress.quizAnswers[quiz.id] || task.progress.shortAnswers[quiz.id];
    rows.push({ task, quiz, done });
  }));
  const doneCount = rows.filter((row) => row.done).length;
  $('#reviewContent').innerHTML = `
    <div class="page-heading"><div><span class="eyebrow">复习中心</span><h1>今天，花 5 分钟巩固一下</h1><p>从未完成的问题继续，知识会记得更牢。</p></div></div>
    <div class="review-stats"><article><span class="stat-icon violet">◎</span><div><strong>${rows.length - doneCount}</strong><small>待完成题目</small></div></article><article><span class="stat-icon green">✓</span><div><strong>${doneCount}</strong><small>已掌握题目</small></div></article><article><span class="stat-icon orange">↗</span><div><strong>${Math.round(doneCount / rows.length * 100) || 0}%</strong><small>总体完成度</small></div></article></div>
    <section class="review-list"><div class="list-heading"><h2>复习队列</h2><span>优先显示未完成内容</span></div>
      ${rows.sort((a, b) => Number(a.done) - Number(b.done)).map((row) => `<article class="review-row ${row.done ? 'complete' : ''}"><span class="review-type">${row.quiz.type === 'choice' ? '选择' : '简答'}</span><div><small>${escapeHTML(row.task.title)} · ${row.quiz.level}</small><h3>${row.quiz.question}</h3></div><span class="review-state">${row.done ? '已完成' : '待复习'}</span><button class="secondary-button small" data-review-task="${row.task.id}">${row.done ? '再做一次' : '开始复习'}</button></article>`).join('')}
    </section>`;
}

function renderAssistant() {
  const task = currentTask();
  if (!task) return;
  const input = $('#chatInput');
  const send = $('.send-button');
  if (task.status !== 'complete') {
    $('#chatBody').innerHTML = `<div class="ai-message"><span class="mini-orb">✦</span><div><p>${task.status === 'analyzing' ? '资料分析完成后，我就能基于内容回答问题。' : '当前任务还没有可用的分析上下文，请先完成资料分析。'}</p></div></div>`;
    input.disabled = true; send.disabled = true;
    return;
  }
  input.disabled = false; send.disabled = false;
  const starters = ['用大白话解释 RAG', '这几份资料有什么共同观点？', '帮我生成面试表达'];
  $('#chatBody').innerHTML = `
    <div class="ai-message"><span class="mini-orb">✦</span><div><p>我已经整理完这 ${task.sources.length} 份资料。你可以让我解释概念、比较观点，或把内容变成可以直接使用的表达。</p></div></div>
    ${task.chat.map((message) => message.role === 'user' ? `<div class="user-message">${escapeHTML(message.text)}</div>` : `<div class="ai-message"><span class="mini-orb">✦</span><div><p>${escapeHTML(message.text)}</p>${task.analysis.points[0] ? `<button data-citation="${task.analysis.points[0].sourceId}|${task.analysis.points[0].snippetId}">查看相关资料</button>` : ''}</div></div>`).join('')}
    ${task.chatPending ? '<div class="ai-message pending-message"><span class="mini-orb">✦</span><div><p>正在结合资料思考…</p></div></div>' : ''}
    ${task.chat.length ? '' : `<div class="suggestions">${starters.map((text) => `<button data-suggestion="${text}">${text}</button>`).join('')}</div>`}`;
  $('#chatBody').scrollTop = $('#chatBody').scrollHeight;
}

async function sendChat(text) {
  const task = currentTask();
  if (!text.trim() || !task || task.chatPending) return;
  task.chat.push({ role: 'user', text: text.trim() });
  task.chatPending = true;
  saveState(); renderAssistant();
  try {
    if (task.contextId) {
      const history = task.chat.slice(0, -1).slice(-8);
      const result = await requestApi('/api/chat', { contextId: task.contextId, question: text.trim(), history });
      task.chat.push({ role: 'assistant', text: result.answer });
    } else {
      const answers = {
        '用大白话解释 RAG': 'RAG 就像让 AI 回答前先翻你的资料：先找到相关段落，再组织答案，所以更容易核对来源。',
        '这几份资料有什么共同观点？': '共同观点是：AI 的价值不只来自生成能力，还来自用户能否理解、验证和控制结果。',
        '帮我生成面试表达': '可以这样说：我会通过原文引用、可编辑结果与人工确认节点，让用户能理解、校验并控制生成过程。'
      };
      await new Promise((resolve) => setTimeout(resolve, 450));
      task.chat.push({ role: 'assistant', text: answers[text.trim()] || '这是预置样例任务。新建任务并完成真实分析后，我就能基于你的资料回答。' });
    }
  } catch (error) {
    task.chat.push({ role: 'assistant', text: `暂时无法回答：${error.message}` });
  } finally {
    task.chatPending = false;
    saveState();
  }
  renderAssistant();
}

function openSource(sourceId, snippetId) {
  const task = currentTask();
  const source = task?.sources.find((item) => item.id === sourceId);
  if (!source) return;
  const snippet = source.snippets.find((item) => item.id === snippetId) || source.snippets[0];
  currentCitation = { sourceId, snippetId: snippet.id };
  $('#sourceReader').innerHTML = `
    <div class="reader-header"><div><span class="eyebrow">原文依据</span><strong>${escapeHTML(source.name)}</strong></div><button class="icon-button" id="closeReader" aria-label="关闭原文">×</button></div>
    <div class="reader-tabs">${source.snippets.map((item, index) => `<button class="${item.id === snippet.id ? 'active' : ''}" data-citation="${source.id}|${item.id}">${String(index + 1).padStart(2, '0')}</button>`).join('')}</div>
    <div class="reader-document"><div class="reader-meta"><span class="mini-file ${source.type}">${sourceIcon(source.type)}</span><span><strong>${escapeHTML(snippet.location)}</strong><small>${escapeHTML(source.meta)}</small></span></div><p>${escapeHTML(snippet.before)}</p><mark>${escapeHTML(snippet.highlight)}</mark><p>${escapeHTML(snippet.after)}</p><div class="reader-context"><span>上下文</span><i></i><small>已高亮支持当前结论的原句</small></div></div>`;
  $('#sourceReader').classList.add('open');
  $('#sourceReader').setAttribute('aria-hidden', 'false');
  $('#workspaceLayout').classList.add('reader-open');
}

function closeReader() {
  $('#sourceReader').classList.remove('open');
  $('#sourceReader').setAttribute('aria-hidden', 'true');
  $('#workspaceLayout').classList.remove('reader-open');
  currentCitation = null;
}

function renderWizard() {
  $$('[data-step-dot]').forEach((dot) => dot.classList.toggle('active', Number(dot.dataset.stepDot) <= wizard.step));
  $('#wizardBack').hidden = wizard.step === 1;
  $('#wizardNext').textContent = wizard.step === 3 ? '开始模拟分析' : '继续';
  if (wizard.step === 1) {
    $('#wizardBody').innerHTML = `<div class="wizard-step"><label class="field-label" for="taskTitleInput">任务名称</label><input class="text-input" id="taskTitleInput" maxlength="50" placeholder="例如：用户研究方法复习" value="${escapeHTML(wizard.title)}"><div class="field-hint"><span>给任务起一个容易找到的名字</span><span id="titleLength">${wizard.title.length}/50</span></div><div class="template-row"><span>快速开始</span><button data-template-title="产品面试资料整理">产品面试资料整理</button><button data-template-title="课程期末复习">课程期末复习</button></div></div>`;
  } else if (wizard.step === 2) {
    $('#wizardBody').innerHTML = `<div class="wizard-step">
      <div class="source-tabs"><button class="${wizard.sourceTab === 'pdf' ? 'active' : ''}" data-source-tab="pdf">上传 PDF</button><button class="${wizard.sourceTab === 'web' ? 'active' : ''}" data-source-tab="web">网页链接</button><button class="${wizard.sourceTab === 'text' ? 'active' : ''}" data-source-tab="text">粘贴文本</button></div>
      ${renderSourceInput()}
      <div class="added-sources"><div><strong>已添加资料</strong><span>${wizard.sources.length} 份</span></div>${wizard.sources.length ? wizard.sources.map((source) => `<div class="added-source"><span class="file-icon ${source.type}">${sourceIcon(source.type)}</span><span><strong>${escapeHTML(source.name)}</strong><small>${escapeHTML(source.meta)}</small></span><button data-remove-wizard-source="${source.id}" aria-label="移除">×</button></div>`).join('') : '<p>还没有资料，可连续添加不同类型的内容。</p>'}</div>
    </div>`;
  } else {
    $('#wizardBody').innerHTML = `<div class="wizard-step confirm-step"><div class="confirm-title"><span>✓</span><div><strong>${escapeHTML(wizard.title)}</strong><small>准备分析 ${wizard.sources.length} 份资料</small></div></div><div class="confirm-sources">${wizard.sources.map((source) => `<span><i class="mini-file ${source.type}">${sourceIcon(source.type)}</i>${escapeHTML(source.name)}</span>`).join('')}</div><div class="demo-notice"><span>i</span><p><strong>真实 AI 分析</strong>资料将通过本机服务发送到你配置的 AI 提供商；浏览器保存分析结果与引用片段，不保存上传的完整文件。</p></div></div>`;
  }
}

function renderSourceInput() {
  if (wizard.sourceTab === 'web') return `<div class="source-input-box"><label class="field-label" for="urlInput">网页地址</label><div class="inline-input"><input class="text-input" id="urlInput" type="url" placeholder="https://example.com/article"><button class="secondary-button" id="addUrlBtn">添加</button></div><small class="error-text" id="urlError"></small></div>`;
  if (wizard.sourceTab === 'text') return `<div class="source-input-box"><label class="field-label" for="pasteInput">笔记内容</label><textarea class="paste-input" id="pasteInput" placeholder="粘贴课堂笔记、会议记录或灵感片段…"></textarea><div class="inline-input"><input class="text-input" id="textNameInput" placeholder="给这段笔记命名（可选）"><button class="secondary-button" id="addTextBtn">添加</button></div><small class="error-text" id="textError"></small></div>`;
  return `<label class="dropzone"><input id="pdfInput" type="file" accept="application/pdf,.pdf" multiple><span>⇧</span><strong>拖入 PDF，或点击选择</strong><small>可连续选择多个文件 · 仅记录文件信息</small></label><small class="error-text" id="pdfError"></small>`;
}

function addPdfFiles(files) {
  const pdfs = [...files].filter((file) => file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'));
  if (!pdfs.length) { $('#pdfError').textContent = '请选择 PDF 文件。'; return; }
  pdfs.forEach((file) => wizard.sources.push({ id: uid('pdf'), type: 'pdf', name: file.name, meta: `${Math.max(.1, file.size / 1024 / 1024).toFixed(1)} MB`, file }));
  renderWizard();
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
    reader.onerror = () => reject(new Error(`无法读取文件“${file.name}”。`));
    reader.readAsDataURL(file);
  });
}

async function buildAnalysisPayload() {
  const sources = [];
  for (const source of wizard.sources) {
    const clean = { type: source.type, name: source.name, meta: source.meta };
    if (source.type === 'pdf') clean.dataBase64 = await fileToBase64(source.file);
    if (source.type === 'web') clean.url = source.url || source.meta;
    if (source.type === 'text') clean.text = source.text || source.preview;
    sources.push(clean);
  }
  return { title: wizard.title.trim(), sources };
}

async function startAnalysis() {
  const task = createTask(uid('task'), wizard.title.trim(), '刚刚');
  task.sources = wizard.sources.map((source) => ({ id: source.id, type: source.type, name: source.name, meta: source.meta, snippets: [] }));
  task.realAnalysis = true;
  task.status = 'analyzing';
  state.tasks.unshift(task);
  state.currentTaskId = task.id;
  state.view = 'workspace';
  closeModal('taskModal');
  saveState();
  renderApp();
  runAnalysisProgress(task);
  try {
    const payload = await buildAnalysisPayload();
    pendingPayloads.set(task.id, payload);
    await submitAnalysis(task, payload);
  } catch (error) {
    failAnalysis(task, error);
  }
}

function runAnalysisProgress(task) {
  analysisTimers.forEach(clearTimeout);
  analysisTimers = [];
  [18, 42, 67, 86].forEach((percent, index) => {
    analysisTimers.push(setTimeout(() => {
      const progress = $('#analysisProgress');
      if (!progress || currentTask()?.id !== task.id) return;
      progress.style.width = `${percent}%`;
      $$('[data-analysis-step]').forEach((step, stepIndex) => {
        step.classList.toggle('done', stepIndex < index);
        step.classList.toggle('active', stepIndex === index);
        $('small', step).textContent = stepIndex < index ? '已完成' : stepIndex === index ? '进行中' : '等待中';
      });
      $('#progressNote').textContent = index === 3 ? '正在准备学习工作台…' : `步骤 ${index + 1}/4`;
    }, 500 + index * 1400));
  });
}

async function submitAnalysis(task, payload) {
  task.status = 'analyzing';
  task.errorMessage = '';
  saveState();
  renderApp();
  runAnalysisProgress(task);
  const result = await requestApi('/api/analyze', payload);
  task.description = result.description || 'AI 已完成资料分析。';
  task.sources = result.sources;
  task.analysis = result.analysis;
  task.contextId = result.contextId;
  task.model = result.model;
  task.status = 'complete';
  task.progress = { quizAnswers: {}, shortAnswers: {}, completedActions: [] };
  task.chat = [];
  pendingPayloads.delete(task.id);
  analysisTimers.forEach(clearTimeout);
  saveState(); renderApp(); renderAssistant(); toast('真实资料分析完成');
}

function failAnalysis(task, error) {
  analysisTimers.forEach(clearTimeout);
  task.status = 'error';
  task.errorMessage = error.message || '分析失败，请稍后重试。';
  saveState(); renderApp();
}

function buildLearningCard() {
  const task = currentTask();
  const summary = task.analysis.summaryVersions[task.analysis.activeVersion];
  $('#learningCard').innerHTML = `<div class="learning-card-brand"><span>✦ Doc Copilot</span><small>学习卡片</small></div><h2>${escapeHTML(task.title)}</h2><p>${escapeHTML(summary)}</p><div class="card-divider"></div><ol>${task.analysis.points.slice(0, 3).map((point) => `<li><span>0${task.analysis.points.indexOf(point) + 1}</span><strong>${point.title}</strong></li>`).join('')}</ol><div class="card-footer"><span>${task.sources.length} 份资料综合整理</span><span>仅供学习参考</span></div>`;
}

function copyText(text, success) {
  if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).catch(() => {});
  toast(success);
}

document.addEventListener('click', async (event) => {
  const target = event.target.closest('button, [data-open-task], [data-view-link]');
  if (!target) return;

  if (target.dataset.closeModal) closeModal(target.dataset.closeModal);
  if (target.dataset.viewLink) { event.preventDefault(); state.view = target.dataset.viewLink; saveState(); renderApp(); }
  if (target.dataset.view) { state.view = target.dataset.view; if (state.view !== 'workspace') closeReader(); saveState(); renderApp(); $('#sidebar').classList.remove('open'); }
  if (target.dataset.openTask) { closeReader(); state.currentTaskId = target.dataset.openTask; state.view = 'workspace'; saveState(); renderApp(); renderAssistant(); }
  if (target.id === 'newTaskBtn' || target.id === 'libraryNewTask' || target.id === 'emptyNewTask' || target.id === 'errorNewTask') { wizard = { step: 1, title: '', sources: [], sourceTab: 'pdf' }; renderWizard(); openModal('taskModal'); }
  if (target.dataset.retryAnalysis) {
    const task = state.tasks.find((item) => item.id === target.dataset.retryAnalysis);
    const payload = pendingPayloads.get(task?.id);
    if (task && payload) {
      try { await submitAnalysis(task, payload); } catch (error) { failAnalysis(task, error); }
    }
  }
  if (target.dataset.templateTitle) { wizard.title = target.dataset.templateTitle; renderWizard(); }
  if (target.id === 'wizardBack') { wizard.step = Math.max(1, wizard.step - 1); renderWizard(); }
  if (target.id === 'wizardNext') {
    if (wizard.step === 1) {
      wizard.title = $('#taskTitleInput')?.value.trim() || '';
      if (!wizard.title) { $('#taskTitleInput').classList.add('invalid'); toast('请先填写任务名称'); return; }
    }
    if (wizard.step === 2 && !wizard.sources.length) { toast('请至少添加一份资料'); return; }
    if (wizard.step === 3) { startAnalysis(); return; }
    wizard.step += 1; renderWizard();
  }
  if (target.dataset.sourceTab) { wizard.sourceTab = target.dataset.sourceTab; renderWizard(); }
  if (target.id === 'addUrlBtn') {
    const input = $('#urlInput');
    try { const url = new URL(input.value.trim()); if (!['http:', 'https:'].includes(url.protocol)) throw new Error(); wizard.sources.push({ id: uid('web'), type: 'web', name: url.hostname.replace(/^www\./, ''), meta: url.href, url: url.href }); renderWizard(); }
    catch (_) { $('#urlError').textContent = '请输入以 http:// 或 https:// 开头的有效网址。'; input.classList.add('invalid'); }
  }
  if (target.id === 'addTextBtn') {
    const text = $('#pasteInput').value.trim();
    if (!text) { $('#textError').textContent = '请先粘贴一些文字内容。'; return; }
    const name = $('#textNameInput').value.trim() || `文本笔记 ${wizard.sources.filter((source) => source.type === 'text').length + 1}`;
    wizard.sources.push({ id: uid('text'), type: 'text', name, meta: `${text.length.toLocaleString()} 字`, text }); renderWizard();
  }
  if (target.dataset.removeWizardSource) { wizard.sources = wizard.sources.filter((source) => source.id !== target.dataset.removeWizardSource); renderWizard(); }
  if (target.dataset.tab) { const task = currentTask(); task.activeTab = target.dataset.tab; saveState(); renderWorkspace(); }
  if (target.dataset.citation) { const [sourceId, snippetId] = target.dataset.citation.split('|'); openSource(sourceId, snippetId); }
  if (target.dataset.openSource) openSource(target.dataset.openSource);
  if (target.id === 'closeReader') closeReader();
  if (target.dataset.copySummary !== undefined) copyText(currentTask().analysis.summaryVersions[currentTask().analysis.activeVersion], '总结已复制');
  if (target.id === 'regenerateBtn') openModal('regenerateModal');
  if (target.dataset.regen) {
    const analysis = currentTask().analysis;
    analysis.previousVersion = analysis.activeVersion;
    closeModal('regenerateModal');
    toast('正在按偏好重新整理…');
    try {
      if (currentTask().contextId) {
        const result = await requestApi('/api/regenerate', { contextId: currentTask().contextId, style: target.dataset.regen });
        analysis.summaryVersions[target.dataset.regen] = result.summary;
      } else {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
      analysis.activeVersion = target.dataset.regen;
      saveState(); renderWorkspace(); toast('新版本已生成');
    } catch (error) {
      analysis.previousVersion = null;
      toast(error.message);
    }
  }
  if (target.id === 'restoreSummary') { const analysis = currentTask().analysis; const old = analysis.activeVersion; analysis.activeVersion = analysis.previousVersion; analysis.previousVersion = old; saveState(); renderWorkspace(); toast('已恢复上一版'); }
  if (target.dataset.answer) {
    const [quizId, optionId] = target.dataset.answer.split('|');
    currentTask().progress.quizAnswers[quizId] = optionId; saveState(); renderWorkspace(); updateChrome();
  }
  if (target.dataset.retryQuiz) { delete currentTask().progress.quizAnswers[target.dataset.retryQuiz]; saveState(); renderWorkspace(); updateChrome(); }
  if (target.dataset.submitShort) {
    const input = $(`[data-short-id="${target.dataset.submitShort}"]`);
    if (!input.value.trim()) { input.classList.add('invalid'); toast('先写下你的想法'); return; }
    const task = currentTask();
    const quiz = task.analysis.quizzes.find((item) => item.id === target.dataset.submitShort);
    task.progress.shortAnswers[target.dataset.submitShort] = { text: input.value.trim(), pending: true, feedback: '' };
    saveState(); renderWorkspace(); updateChrome();
    try {
      if (task.contextId) {
        const result = await requestApi('/api/grade', { contextId: task.contextId, question: quiz.question, answerGuide: quiz.answerGuide, answer: input.value.trim() });
        task.progress.shortAnswers[target.dataset.submitShort].feedback = result.feedback;
      } else {
        await new Promise((resolve) => setTimeout(resolve, 450));
        task.progress.shortAnswers[target.dataset.submitShort].feedback = '思路很好。你抓住了“可验证”这个关键点，还可以补充结果可编辑以及关键步骤由用户确认。';
      }
    } catch (error) {
      task.progress.shortAnswers[target.dataset.submitShort].feedback = `点评失败：${error.message}`;
    }
    task.progress.shortAnswers[target.dataset.submitShort].pending = false;
    saveState(); renderWorkspace();
  }
  if (target.dataset.retryShort) { delete currentTask().progress.shortAnswers[target.dataset.retryShort]; saveState(); renderWorkspace(); updateChrome(); }
  if (target.dataset.libraryFilter) { state.libraryFilter = target.dataset.libraryFilter; saveState(); renderLibrary(); }
  if (target.dataset.reviewTask) { state.currentTaskId = target.dataset.reviewTask; currentTask().activeTab = 'quiz'; state.view = 'workspace'; saveState(); renderApp(); renderAssistant(); }
  if (target.dataset.suggestion) sendChat(target.dataset.suggestion);
  if (target.id === 'exportBtn') { buildLearningCard(); openModal('exportModal'); }
  if (target.id === 'copyCardBtn') {
    const task = currentTask();
    const text = `${task.title}\n\n${task.analysis.summaryVersions[task.analysis.activeVersion]}\n\n${task.analysis.points.slice(0, 3).map((point, index) => `${index + 1}. ${point.title}`).join('\n')}`;
    copyText(text, '学习卡片已复制');
  }
  if (target.id === 'resetDemoBtn') openModal('confirmResetModal');
  if (target.id === 'confirmResetBtn') { state = initialState(); localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); closeModal('confirmResetModal'); closeReader(); renderApp(); renderAssistant(); toast('演示数据已重置'); }
  if (target.id === 'menuBtn') $('#sidebar').classList.toggle('open');
  if (target.id === 'openAssistant') $('#assistantPanel').classList.add('open');
  if (target.id === 'closeAssistant') $('#assistantPanel').classList.remove('open');
});

document.addEventListener('change', (event) => {
  if (event.target.id === 'pdfInput') addPdfFiles(event.target.files);
  if (event.target.dataset.actionId) {
    const task = currentTask();
    const id = event.target.dataset.actionId;
    if (event.target.checked && !task.progress.completedActions.includes(id)) task.progress.completedActions.push(id);
    if (!event.target.checked) task.progress.completedActions = task.progress.completedActions.filter((item) => item !== id);
    saveState(); renderWorkspace(); updateChrome();
  }
});

document.addEventListener('input', (event) => {
  if (event.target.id === 'taskTitleInput') { wizard.title = event.target.value; $('#titleLength').textContent = `${wizard.title.length}/50`; }
});

$('#chatForm').addEventListener('submit', (event) => { event.preventDefault(); const input = $('#chatInput'); sendChat(input.value); input.value = ''; });
$('#chatInput').addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    sendChat(event.target.value);
    event.target.value = '';
  }
});

$$('.modal-backdrop').forEach((backdrop) => backdrop.addEventListener('click', (event) => { if (event.target === backdrop) closeModal(backdrop.id); }));
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') { $$('.modal-backdrop.open').forEach((modal) => closeModal(modal.id)); closeReader(); $('#assistantPanel').classList.remove('open'); $('#sidebar').classList.remove('open'); }
});

renderApp();
renderAssistant();
checkHealth();
