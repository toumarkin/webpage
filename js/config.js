// =====================================================================
//  НАСТРОЙКИ. Всё, что обычно хочется поменять, собрано здесь.
//  Экранов восемь: Order, University, Context, Descent, Distortion, Break, Fragments, Own rules.
//  Order, University и Context — грид ещё цел. На University фигура переодевается
//  в мантию (с дипломом), на Context подбрасывает шапочку, а на стены встают картинки.
//  Разрушение идёт с Context до конца, и для него прокрутка превращается
//  в число «stage» от 0 до 5:
//  0 = Context, 1 = Descent, 2 = Distortion, 3 = Break, 4 = Fragments, 5 = Own rules.
//  Дробные значения (2.5) — моменты между кадрами.
// =====================================================================

export const COLORS = {
  paper: 0xfafaf7,   // фон сцены (совпадает с --paper в css/style.css)
  line: 0x7c7d82,    // линии грида (светло-серые, как на референсе)
  // цвета панелей в финале (Own rules)
  accents: [0xc56a3d, 0x7fa6d6, 0xe2b84a],
};

// Шрифт надписей в 3D-сцене (на Windows без Helvetica будет Arial)
export const FONT = '"Helvetica Neue", Helvetica, Arial, sans-serif';

// Надписи на стенах комнаты.
// lines: строки (size — размер в px текстуры, lh — межстрочный, gap — отступ сверху, track — трекинг в em)
// width: ширина надписи в единицах сцены (комната: x −5…5, y −3…5, z −10…8)
// wall/wallRot: где висит в начале; fly/flyRot: куда отлетает на Break;
// final/finalRot/finalScale: место в финале (Own rules); breakAt: когда отрывается (доля прокрутки)
// away: номер экрана, с которого надпись уходит (0 Order, 1 University, 2 Context…);
//   без away все надписи уходят на Context. Возвращаются, когда стены отрываются.
// screens: [с, по] — надпись только для этих экранов (в разлёте и финале её нет).
const NAME = { size: 200, weight: 700, lh: 0.96, track: -0.025 };
const BODY = { size: 72, weight: 400, lh: 1.2 };
export const WALL_TEXT = [
  { // имя — задняя стена, слева от фигуры
    lines: [
      { ...NAME, text: 'Nataliya' },
      { ...NAME, text: 'Toumarkin' },
    ],
    width: 4.2,
    wall: [-1.96, 3.16, -9.85], wallRot: [0, 0, 0],
    fly: [-2.8, 3.0, -5.5], flyRot: [0.2, 0.5, -0.15],
    final: [-2.9, 2.52, -1.6], finalRot: [0, 0.3, -0.04], finalScale: 0.62,
    breakAt: 0.61,
  },
  { // роль — задняя стена, под именем
    lines: [
      { ...BODY, text: 'Product Designer' },
      { ...BODY, text: '& Web Developer' },
    ],
    width: 2.52,
    wall: [-2.78, 1.68, -9.85], wallRot: [0, 0, 0],
    fly: [-3.4, 1.4, -6.2], flyRot: [-0.15, 0.6, 0.1],
    final: [-3.4, 1.6, -1.45], finalRot: [0, 0.3, -0.04], finalScale: 0.62,
    breakAt: 0.63, away: 0.5,
  },
  { // экран University — вместо роли под именем
    lines: [
      { ...BODY, text: 'M.A. Graduate in' },
      { ...BODY, text: 'Public Relations' },
    ],
    width: 2.52,
    wall: [-2.78, 1.68, -9.85], wallRot: [0, 0, 0],
    screens: [0.5, 1.4],
  },
  { // слоган — левая стена
    lines: [
      { ...BODY, text: 'Turning ideas into' },
      { ...BODY, text: 'meaningful digital' },
      { ...BODY, text: 'experiences.' },
    ],
    width: 2.3,
    wall: [-4.9, 1.52, -0.95], wallRot: [0, Math.PI / 2, 0],
    fly: [-4.2, 0.4, -2.8], flyRot: [0.3, 0.9, 0.2],
    final: [-3.3, 0.05, 0.8], finalRot: [0, 0.4, 0.04], finalScale: 0.8,
    breakAt: 0.53, away: 0.5,
  },
  { // город и почта — правая стена
    lines: [
      { ...BODY, text: 'Ramat Gan, Israel' },
      { ...BODY, text: 'toumarkinn@gmail.com', gap: 6 },
    ],
    width: 2.6,
    wall: [4.9, 1.68, -2.53], wallRot: [0, -Math.PI / 2, 0],
    fly: [4.2, -0.8, -2.6], flyRot: [-0.2, -0.9, -0.1],
    final: [-3.4, -0.85, 0.8], finalRot: [0, 0.4, 0.03], finalScale: 0.7,   // под слоганом, справа — работы
    breakAt: 0.55, away: 0.5,
  },
];

// Картинки на стенах. Появляются на втором экране (Context), каждая ровно в клетках
// грида, и потом осыпаются по одной клетке.
// Клетки 1×1, линии грида проходят по целым числам. Стены комнаты:
//   left  — x = −5, задаётся z (−10…8) и y (−3…5); надпись читается от зрителя вглубь
//   right — x = 5,  задаётся z (−10…8) и y (−3…5)
//   back  — z = −10, задаётся x (−5…5) и y (−3…5)
// С камеры видно примерно z от −10 до 1.5 на боковых стенах.
// src — файл (например 'assets/scenes/politics.jpg'); обрезается по размеру
//   прямоугольника, как object-fit: cover. Пусто — рисуется заглушка.
// focus: [x, y] от 0 до 1 — какая часть фото остаётся при обрезке (0.5, 0.5 — центр;
//   [0.5, 0] — держать верх). Так фото выравнивается в своём прямоугольнике.
// tag — плашка с надписью в верхнем углу (\n — перенос), занимает целые клетки;
// tagSide: 'left' | 'right'; tagColor — цвет плашки.
// Без src рисуется графичная плашка цвета tone (ink, steel, warm, navy).
export const WALL_IMAGES = [
  { src: 'assets/scenes/politics.jpg', focus: [0.55, 0.5], tag: 'Politics', tagColor: '#d3262a', tone: 'navy',
    wall: 'left', z: [-4, 0], y: [-2, 3] },
  { src: 'assets/scenes/fund.jpg', focus: [0.4, 0.5], tag: 'Deputy\nassistant', tagSide: 'right', tagColor: '#16263f',
    wall: 'left', z: [-10, -4], y: [-1, 3] },
  { src: 'assets/scenes/school.jpg', focus: [0.5, 0.35], tag: 'Community', tagSide: 'right', tagColor: '#16263f',
    wall: 'back', x: [-4, 4], y: [-1, 3] },
  { src: 'assets/scenes/stage.jpg', focus: [0.5, 0.5],
    wall: 'right', z: [-9, 0], y: [-1, 3] },
];

// Общая цветокоррекция фото, чтобы все были в одной гамме:
// saturate — насыщенность (1 = как есть), contrast, tint — цвет, в который фото
// слегка уводится, tintAmount — насколько сильно (0…1), lift — осветление теней (0…1).
export const IMAGE_GRADE = { saturate: 0.38, contrast: 1.08, tint: '#4f6a8f', tintAmount: 0.45, lift: 0.07 };

// Экран Distortion (2016, Израиль): картинки политики осыпаются со стен и улетают из кадра,
// а в те же клетки встают элементы Израиля. На Break Израиль тоже рассыпается на квадратики.
// Прямоугольники — как в WALL_IMAGES (стена + клетки). blocks — элементы внутри:
//   cells: [кол. от, строка от, кол. до, строка до] — клетки от верхнего левого угла
//          (как видит зритель), «до» не включительно; пустые клетки остаются белым гридом.
//   text или lines ([{ text, rel — размер относительно, font, weight }]), font: 'sans' | 'mono',
//   bg / ink — фон и цвет текста, align: 'left' — по левому краю. Размер текста подбирается сам.
//   code: true — подсветка синтаксиса, как в редакторе кода; иврит пишется книжным шрифтом Frank Ruhl Libre.
//   src — фото вместо текста (обрезается по клеткам; focus: [x, y] — какую часть оставить).
const NAVY = '#1d2436', PAPER = '#f6f5f1', SKY = '#dfe5ee';
// Слева — иврит (учу язык), справа — код (учу программирование), задняя стена их соединяет.
export const ISRAEL_WALLS = [
  // ── ИВРИТ: левая стена ──
  { wall: 'left', z: [-4, 0], y: [-2, 3], blocks: [          // 4 × 5, ближе к зрителю
    { cells: [1, 0, 4, 1], text: 'ISRAEL / 2016', font: 'mono', bg: NAVY, ink: '#fff', max: 0.3 },
    { cells: [0, 1, 1, 2], text: 'ד', bg: PAPER, ink: NAVY },
    { cells: [1, 1, 2, 2], text: 'ג', bg: NAVY, ink: '#fff' },
    { cells: [2, 1, 3, 2], text: 'ב', bg: PAPER, ink: NAVY },
    { cells: [3, 1, 4, 2], text: 'א', bg: SKY, ink: NAVY },
    { cells: [0, 2, 2, 4], text: 'שלום', bg: PAPER, ink: NAVY },
    { cells: [2, 2, 4, 4], src: 'assets/scenes/israel-flag.jpg', focus: [0.45, 0.45] },
    { cells: [1, 4, 3, 5], text: '← RTL', font: 'mono', bg: SKY, ink: NAVY, max: 0.4 },
    { cells: [3, 4, 4, 5], text: 'ה', bg: NAVY, ink: '#fff' },
  ] },
  { wall: 'left', z: [-10, -4], y: [-1, 3], blocks: [        // 6 × 4, дальше
    { cells: [0, 0, 3, 3], src: 'assets/scenes/ulpan.jpg', focus: [0.5, 0.3] },         // ульпан «Гордон»
    { cells: [3, 0, 6, 3], src: 'assets/scenes/ulpan-class.jpg', focus: [0.5, 0.5] },   // урок иврита
    { cells: [0, 3, 4, 4], text: 'Learning to speak.', font: 'mono', bg: PAPER, ink: NAVY },
    { cells: [4, 3, 6, 4], text: 'עברית', bg: SKY, ink: NAVY },
  ] },
  // ── задняя стена: иврит слева, код справа ──
  { wall: 'back', x: [-4, 4], y: [-1, 3], blocks: [           // 8 × 4
    { cells: [1, 0, 7, 2], bg: PAPER, ink: NAVY, lines: [
      { text: 'שלום / Hello, world!' }, { text: 'NEW LANGUAGES. NEW BEGINNING.', rel: 0.3, font: 'mono', weight: 500 }] },
    { cells: [0, 2, 2, 4], src: 'assets/scenes/tel-aviv.jpg', focus: [0.6, 0.3] },
    { cells: [6, 2, 7, 3], text: '</>', font: 'mono', code: true, bg: NAVY, ink: '#fff' },
    { cells: [7, 3, 8, 4], text: '{ }', font: 'mono', code: true, bg: NAVY, ink: '#fff' },
  ] },
  // ── КОД: правая стена (колонка 0 — дальняя) ──
  { wall: 'right', z: [-9, 0], y: [-1, 3], blocks: [          // 9 × 4
    { cells: [0, 0, 4, 1], text: 'const hello = "שלום";', font: 'mono', code: true, bg: NAVY, ink: '#fff' },
    { cells: [0, 1, 2, 2], text: 'LTR →', font: 'mono', bg: SKY, ink: NAVY, max: 0.4 },
    { cells: [2, 1, 3, 2], text: '</>', font: 'mono', code: true, bg: NAVY, ink: '#fff' },
    { cells: [3, 1, 4, 2], text: '{ }', font: 'mono', code: true, bg: NAVY, ink: '#fff' },
    { cells: [5, 0, 9, 3], src: 'assets/scenes/coding-class.jpg', focus: [0.5, 0.5] },   // курс программирования
    { cells: [0, 2, 5, 3], text: 'console.log("Hello, world!");', font: 'mono', code: true, bg: NAVY, ink: '#fff' },
    { cells: [0, 3, 5, 4], text: '<html lang="he" dir="rtl">', font: 'mono', code: true, bg: NAVY, ink: '#fff' },
    { cells: [5, 3, 9, 4], text: 'Learning to code.', font: 'mono', bg: PAPER, ink: NAVY },
  ] },
];

// Подписи кадров: [название, описание (не показывается), строка под названием — только если есть]
export const STAGES = [
  ['Order', 'A perfect perspective grid: one vanishing point, an even grid, a clear hierarchy.'],
  ['University', 'University: an M.A. in Public Relations. A gown and a cap — order that comes with a stamp.',
    'Master’s degree in Public Relations.'],
  ['Politics', 'Experience fills the walls: politics, community. Every picture sits exactly in the grid — the order still holds.',
    'Assistant to a deputy of the Legislative Assembly and the City Duma. Head of a charitable foundation.'],
  ['Descent', 'The floor cracks underfoot. The suit falls apart.'],
  ['Aliyah', 'Learning to speak. Learning to code.'],   // Distortion: Израиль
  ['Tools', 'The walls let go — and my tools appear: Figma, Adobe, code, Unity, Fusion.',
    'Figma, Photoshop, Illustrator, InDesign · HTML, CSS, JavaScript, Angular · PHP, Laravel, MySQL, PostgreSQL, MongoDB, WordPress · Unity, Fusion.'],   // Break
  ['Fragments', 'Fragments of the grid and my tools float around, waiting to be put in order.'],
  ['Selected study projects', 'The pieces settle into a new order — my own rules. Pick a direction: UX/UI design, graphic design, code or game design.'],
];

// Годы вместо номера кадра (большая надпись внизу слева), по порядку экранов STAGES.
// null — показывать номер (04, 05…).
export const STAGE_YEARS = ['Present', '2005–2012', '2008–2015', '', '2016', '', '', ''];   // '' — без номера

// Позы, лица и наклоны ниже считаются по stage 0…5 (см. начало файла):
// на экранах Order и Context фигура в позе stage 0.
// Позы тела: [stage, имя файла из assets/figure/poses]
// Соседние позы сменяются коротким наплывом посередине между своими stage.
export const POSE_KEYS = [
  [0, 'down'],
  [1, 'down'],
  [2, 'balance'],
  [2.5, 'tpose'],   // промежуточная: руки по пути вверх
  [3, 'up'],
  [4, 'reach'],
  [5, 'wave'],
];

// Лица: [stage, номер лица 1–9 из assets/figure/faces] (по листу 3×3, построчно)
// 1 нейтральное · 2 лёгкая улыбка · 3 широкая улыбка
// 4 испуг · 5 мягкая улыбка · 6 глаза закрыты
// 7 взгляд в сторону · 8 улыбка вбок · 9 взгляд вверх
export const FACE_KEYS = [
  [0, 1],
  [1, 7],
  [2, 4],
  [3, 6],
  [4, 9],
  [4.5, 8],
  [5, 3],
];

// Наклон головы и всей фигуры на каждом кадре (радианы, + = по часовой стрелке)
export const HEAD_TILT = [0, 0.08, -0.15, 0.1, -0.12, -0.08];
export const BODY_TILT = [0, 0, 0.03, -0.04, 0.05, 0];

// Инструменты, которые летают вокруг фигуры на экране Fragments (иконки рисуются в world.js).
// style: 'adobe' — плитка с буквами (Ps, Ai…), 'badge' — цветная плитка с названием, или свой рисунок (figma, unity, js, json…).
export const TOOLS = [
  { key: 'figma', label: 'Figma' },
  { key: 'ps', label: 'Ps', style: 'adobe', bg: '#001e36', ink: '#31a8ff' },
  { key: 'ai', label: 'Ai', style: 'adobe', bg: '#330000', ink: '#ff9a00' },
  { key: 'id', label: 'Id', style: 'adobe', bg: '#49021f', ink: '#ff3366' },
  { key: 'html', label: 'HTML', style: 'badge', bg: '#e34f26', ink: '#ffffff', sub: '5' },
  { key: 'css', label: 'CSS', style: 'badge', bg: '#1572b6', ink: '#ffffff', sub: '3' },
  { key: 'js', label: 'JS' },
  { key: 'angular', label: 'A' },
  { key: 'php', label: 'php' },
  { key: 'laravel', label: 'Laravel', style: 'badge', bg: '#ff2d20', ink: '#ffffff' },
  { key: 'mysql', label: 'MySQL', style: 'badge', bg: '#00758f', ink: '#ffffff' },
  { key: 'postgres', label: 'Postgres', style: 'badge', bg: '#336791', ink: '#ffffff', sub: 'SQL' },
  { key: 'mongodb', label: 'Mongo', style: 'badge', bg: '#13aa52', ink: '#ffffff', sub: 'DB' },
  { key: 'wordpress', label: 'W' },
  { key: 'json', label: '{ }', style: 'badge', bg: '#16171a', ink: '#f7df1e', sub: 'JSON' },
  { key: 'unity', label: 'Unity' },
  { key: 'fusion', label: 'F', style: 'adobe', bg: '#1d1d1d', ink: '#ff8a00', sub: 'Fusion' },
];

// Разделы работ на последнем экране (Own rules): сначала три доски-раздела,
// по клику раздел рассыпается и собирается в доски своих проектов (cat у проекта = key раздела).
// lines — строки заголовка («*» — контуром), bg/ink — цвета доски, slot — место доски (CAT_SPOTS в world.js: 0–3 сверху вниз).
export const WORK_CATEGORIES = [
  { key: 'graphic', title: 'Graphic Design', lines: ['Graphic', 'Design*'], bg: '#e0119a', ink: '#f4f000', slot: 0 },
  { key: 'product', title: 'UX/UI Design', lines: ['UX/UI', 'Design*'], bg: '#c8202a', ink: '#ffffff', slot: 1 },
  { key: 'code', title: 'Code', lines: ['Code', '</>*'], bg: '#16171a', ink: '#7cf2c6', slot: 2 },
  { key: 'game', title: 'Game Design', lines: ['Game', 'Design*'], bg: '#3b2a8f', ink: '#ffd84a', slot: 3 },
];

// Кейс Bank Hapoalim для окна проекта (тексты и картинки — со страницы toumarkin.com/hapoalim-project).
// Блоки: h — заголовок раздела (n — номер), p — абзац, quote — крупная цитата, img — картинка (cap — подпись),
// pair — две картинки рядом, pains — боли пользователей, flows — варианты A/B, voices — отзывы,
// phone — анимация прототипа + список решений (list: [заголовок, текст]).
const HP = 'assets/design/hapoalim/';
const HAPOALIM_CASE = [
  { h: 'From classroom to real impact', n: 'Background' },
  { p: 'This project began not in Figma — but at the source. As part of the Google & Reichman Tech School program, we were invited into the heart of Bank Hapoalim to explore the real-world challenges behind digital banking. After a lecture on Israel’s financial systems and credit infrastructure, our team was tasked with a mission:' },
  { quote: 'How might we transform the mobile credit card ordering experience into something seamless, personal, and empowering?' },
  { img: HP + 'intro.jpg' },
  { h: 'Immersion & understanding the problem', n: '01' },
  { p: 'We started by mapping the existing flow, then stepped into the shoes of real users. Conversations, competitive benchmarking, and product deep-dives uncovered a number of pain points that made the experience feel frustrating and disconnected.' },
  { img: HP + 'flow-map.png', cap: 'The existing flow' },
  { pains: [
    [HP + 'pain-onboarding.png', 'Hidden onboarding', 'Process details: no timeline or requirements'],
    [HP + 'pain-cards.png', 'Identical-looking cards', 'Selection options: no personalization'],
    [HP + 'pain-billing.png', 'Fixed billing dates', 'No financial guidance'],
    [HP + 'pain-delivery.png', 'Complicated delivery', 'Approval issues, strict methods'],
  ] },
  { h: 'Market insights: local & global inspiration', n: '02' },
  { p: 'To reimagine the experience, we studied global leaders like N26, Revolut, Monzo, and Starling, alongside local competitors such as Discount Bank, Leumi, and Mizrahi-Tefahot.' },
  { pair: [HP + 'banks-global.webp', HP + 'banks-local.webp'] },
  { h: 'Testing a hypothesis: do tags improve experience?', n: '03' },
  { p: 'We came up with the idea to personalize the credit card selection process by letting users choose interest-based tags. This would allow the system to recommend cards more relevant to their lifestyle and needs. To test this hypothesis, we created two versions of the flow:' },
  { flows: [
    [HP + 'flow-a.webp', 'Flow A', 'A familiar version showing a generic list of cards'],
    [HP + 'flow-b.webp', 'Flow B', 'A personalized version, where users selected interest tags before receiving tailored card suggestions'],
  ] },
  { p: 'We conducted A/B testing with over 20 participants. The results exceeded our expectations — an overwhelming majority of users preferred the personalized flow and said it made choosing a card easier, faster, and more relevant.' },
  { voices: [
    'I liked that it’s personalized. I don’t need to read all the comparisons – I just choose what matters to me.',
    'It feels like the bank understands me – I say what I want, and it gives me a solution.',
    'I’m a student and don’t understand credit cards – this way it’s simple and easy.',
  ] },
  { h: 'Final design highlights', n: '04' },
  { phone: HP + 'hapoalim-prototype.webp', list: [
    ['Intro & progress', 'Friendly intro screen with 3-step visual roadmap'],
    ['Tag-based personalization', 'Let users tell us who they are — we handle the complexity'],
    ['Card selection', 'Lifestyle-based visuals, clear benefits, and confident copywriting'],
    ['Billing date guidance', 'Smart defaults + contextual explanations'],
    ['Direct debit prompt', 'Subtle nudge to make this the primary card'],
    ['Digital wallet integration', 'No skip — just flow'],
    ['Approval & confirmation', 'Calm, clear finish that reinforces trust'],
  ] },
  { h: 'Presenting to the bank', n: '05' },
  { img: HP + 'presentation.webp' },
];

// Кейс Belladonna Publishing — по брендбуку (Shenkar, 2024). Картинки — assets/design/belladonna/.
// Ещё блоки: steps — нумерованный список [заголовок, текст], swatches — цвета [имя, HEX, роль],
// fonts — шрифты [название, для чего, CSS-семейство для образца], grid — три картинки в ряд,
// gallery — галерея с подписями [картинка, подпись]. heroRatio — пропорции верхней картинки окна.
const BD = 'assets/design/belladonna/';
const BELLADONNA_CASE = [
  { h: 'A publisher of classic English detective fiction', n: 'Background' },
  { p: 'Belladonna Publishing specializes in classic English detective fiction. Its first project is a series of Agatha Christie’s novels about the private detective Hercule Poirot. The publisher aims to revive interest in classic English crime fiction by publishing meaningful, enduring stories. I designed the whole project at Shenkar, 2024: the identity and its brand book, the ten-book collection, the box set, posters and stationery.' },
  { steps: [
    ['Historical heritage', 'A link to the classic detective tradition — Arthur Conan Doyle, Agatha Christie, Rex Stout.'],
    ['Quality & style', 'Vintage-style covers, quality paper, careful editing and translation.'],
    ['Exclusive collections', 'Limited series with original illustrations, forewords and collector’s editions.'],
    ['Educational value', 'Essays on the authors’ lives, historical context and literary analysis.'],
    ['Built to last', 'Digital versions exist, but the printed book stays at the heart of the brand.'],
  ] },
  { h: 'Logo: a book under a hot-air balloon', n: '01' },
  { p: 'The name and the logo were inspired by Gerald Durrell’s classic “The Flying House” — full of adventures and boundless energy. Every book is a journey: the mark shows a book floating under a hot-air balloon, a symbol of freedom of thought and of the endless possibilities each new volume opens.' },
  { img: BD + 'inspiration.jpg', small: true, cap: 'Inspiration: a hot-air balloon + an open book' },   // исходник маленький — показываем уже
  { pair: [BD + 'logo.jpg', BD + 'logo-grid.jpg'] },
  { p: 'Logotype in Soleil Extrabold, slogan “Ode to classics” in DIN Alternate Bold. The clear space is set by the “O” in BELLADONNA.' },
  { h: 'Colors & typography: Art Deco elegance', n: '02' },
  { swatches: [
    ['Indigo', '#647a83', 'primary'], ['Beige', '#f4e0c3', 'secondary'], ['Burgundy', '#8d545b', 'secondary'],
    ['Brown-beige', '#7d6446', 'secondary'], ['Black', '#000000', 'secondary'], ['White', '#ffffff', 'secondary'],
  ] },
  { fonts: [
    ['Silver Streak', 'Headings — Art Deco, the elegance of the era', '"Silver Streak", "Big Shoulders Display", Impact, sans-serif'],
    ['Almoni', 'Body text — neutral and highly readable', '"Almoni", "Helvetica Neue", Arial, sans-serif'],
    ['Soleil Extrabold', 'Logotype', '"Soleil", "Helvetica Neue", Arial, sans-serif'],
    ['DIN Alternate Bold', 'Slogan', '"DIN Alternate", "DIN Condensed", "Helvetica Neue", sans-serif'],
  ] },
  { h: 'Pattern: “The Age of Grace”', n: '03' },
  { p: 'An Art Deco pattern of geometric shapes and refined lines — a nod to an era of cultural flourishing that underlines the quality of the books. As a background it repeats on a brand color at 12% opacity.' },
  { pair: [BD + 'pattern-unit.jpg', BD + 'pattern-bg.jpg'] },
  { h: 'Posters: three portraits of Agatha', n: '04' },
  { p: 'Posters for the presentation of the series at the London Library: Agatha Christie’s portrait assembled from covers and spreads of the new edition, in three brand colors.' },
  { img: BD + 'posters.jpg' },
  { h: 'Bookmarks & stationery', n: '05' },
  { pair: [BD + 'bookmarks-indigo.jpg', BD + 'bookmarks-burgundy.jpg'] },
  { p: 'Business cards, letterhead, envelope, memo pad, invoice and a paper bag — the pattern always stays quiet, at 12% opacity.' },
  { grid: [BD + 'stationery.jpg', BD + 'business-card.jpg', BD + 'bag.jpg'] },
  { h: 'Book covers: editorial illustration as collage', n: '06' },
  { p: 'Each cover is an editorial illustration based on the novel’s text, made as a collage: vintage engravings recolored into the palette (Creative Commons), with characters generated in Adobe Firefly in an engraving style, based on stills from ITV’s “Agatha Christie’s Poirot” (1989–2013).' },
  { pair: [BD + 'cover-technique.jpg', BD + 'cover-ai.jpg'] },
  { img: BD + 'cover.jpg', cap: 'Cover layout: logo and number on the spine, synopsis and a graphic echo of the front on the back, ISBN' },
  { p: 'The whole series — ten novels, ten collages:' },
  { gallery: [
    [BD + 'cover-01.jpg', 'The Mysterious Affair at Styles'], [BD + 'cover-02.jpg', 'The Murder on the Links'],
    [BD + 'cover-03.jpg', 'The Mystery of the Blue Train'], [BD + 'cover-04.jpg', 'Peril at End House'],
    [BD + 'cover-05.jpg', 'Murder in Mesopotamia'], [BD + 'cover-06.jpg', 'Dumb Witness'],
    [BD + 'cover-07.jpg', 'Death on the Nile'], [BD + 'cover-08.jpg', 'Evil Under the Sun'],
    [BD + 'cover-09.jpg', 'Dead Man’s Folly'], [BD + 'cover-10.jpg', 'Curtain'],
  ] },
  { pair: [BD + 'book-nile.jpg', BD + 'book-mesopotamia.jpg'] },
  { img: BD + 'endpapers.jpg', cap: 'Endpapers: the pattern on the first spread of every book' },
  { h: 'Box set: ten books, one image', n: '07' },
  { p: 'The box holds all ten books as one product: the spines line up into a single portrait of Poirot, the sleeve shows Poirot and Hastings on a London street, and inside there is a letter to the reader.' },
  { pair: [BD + 'spines.jpg', BD + 'box-open.jpg'] },
  { img: BD + 'box.jpg' },
];

// Кейс The Museum of Beloved Things (HIT, 2026) — по презентации и работе; скриншоты — с живого сайта.
const MB = 'assets/design/museum/';
const MUSEUM_CASE = [
  { meta: [
    ['Role', 'Research, UX/UI design, full-stack development — solo'],
    ['Timeline', '6 weeks · June–July 2026'],
    ['Stack', 'PHP, MySQL, HTML, CSS, JavaScript — no frameworks'],
    ['Context', 'HIT, Faculty of Design · Instructor: Elias Messinas'],
  ] },

  { h: 'Objects die before their time', n: '01 · Problem', nav: 'Problem' },
  { p: 'Circular economy is usually discussed through material flows — recycling, reuse, waste. Yet most things are discarded psychologically long before they are physically broken. The economy is becoming less circular every year, and consumer objects barely return to the cycle.' },
  { stats: [
    ['6.9%', 'global circularity — and falling', '7.2% in 2018'],
    ['≈66%', 'of greenhouse-gas emissions', 'driven by material extraction and use'],
    ['7.0 yrs', 'appliance lifespan in Israel’s OECD group', 'the world’s shortest · global average 9'],
    ['90%', 'of discarded computers', 'still function'],
  ], src: 'Circle Economy, The Circularity Gap Report 2025 · Chapman, Emotionally Durable Design, 2005, p. 20' },

  { h: 'The relationship fails, not the object', n: '02 · Insight', nav: 'Insight' },
  { quote: 'Waste… is nothing more than a symptom of a failed relationship between the subject and the object.' },
  { p: 'Jonathan Chapman (Carnegie Mellon University) — the conceptual mentor of the project. Existing circular-economy tools act after an object has become waste. The moment before disposal, while the decision is still reversible, is reached by neither policy nor design.' },
  { timeline: [['Purchase'], ['Use'], ['The moment of doubt', true], ['Waste']], note: 'The unaddressed moment — the project works here.' },

  { h: 'A museum for the things we keep', n: '03 · Solution', nav: 'Solution' },
  { p: 'A web platform structured like a museum. Anyone can exhibit an object: photographs including scratches and repairs, its story, and a written biography of its life. An object with a published biography is far easier to keep, repair or pass on than to throw away.' },
  { steps: [['Pause', 'A slow feed: one object per screen, no likes or counters.'], ['Remember', 'The story, written with guiding questions.'], ['Repair', 'Marks of time and visible repairs as museum labels.'], ['Revalue', 'A passport of life events turns a thing into a witness.'], ['Continue using', 'The biography keeps growing after publication.']] },
  { img: MB + 'home.jpg', cap: 'Homepage — a changing “litany” of exhibited objects' },
  { img: MB + 'gallery.jpg', cap: 'Gallery — one exhibit per screen, immersion instead of scrolling' },

  { h: 'From theory to interface', n: '04 · UX', nav: 'UX' },
  { p: 'Chapman’s five elements of emotional durability became the information architecture of the platform:' },
  { map: [['Narrative', 'the object’s story'], ['Consciousness', 'guiding questions'], ['Memory', 'the passport of life events'], ['Personality', 'the category of meaning'], ['Surface', 'the marks-of-time gallery']] },
  { p: 'Hand-drawn wireframes and a user-flow map defined the slow feed, the exhibit page and the submission path — including curator review — before any visual design.' },
  { pair: [MB + 'wireframes.jpg', MB + 'flow.jpg'] },

  { h: 'A six-step ritual, not a form', n: '05 · Submission', nav: 'Ritual' },
  { p: 'Adding an object is designed as a quiet ritual: the thing and its photos, the category of meaning (a witness to an event, a mirror of its keeper, a thing with character), the story, a passport of events, close-ups of marks of time, and attribution — anonymous if you like. After submitting, the contributor gets a private edit link by email: no account, no password.' },
  { pair: [MB + 'wizard.jpg', MB + 'step-meaning.jpg'] },
  { pair: [MB + 'step-story.jpg', MB + 'step-passport.jpg'] },
  { img: MB + 'step-marks.jpg', cap: 'Steps 1–5 of the ritual, live at museum.toumarkin.com/Add.html' },

  { h: 'A dark editorial museum', n: '06 · Visual design', nav: 'Design' },
  { p: 'The design deliberately inverts the logic of social feeds: each object takes a full screen and asks for attention. Warm near-black, cream text and a single muted-gold accent; a soft film grain, gentle parallax and slow fades — nothing fast or distracting.' },
  { swatches: [['Near-black', '#1c1916', 'background'], ['Cream', '#f1e8d8', 'text'], ['Muted gold', '#c8a35a', 'accent'], ['Umber', '#3a2c22', 'surfaces']] },
  { fonts: [['Spectral', 'Headlines and pull quotes — archival character', 'Spectral, Georgia, serif'], ['Hanken Grotesk', 'Stories and body text', '"Hanken Grotesk", "Helvetica Neue", sans-serif'], ['Space Mono', 'Labels, categories, dates — museum placards', '"Space Mono", monospace']] },
  { pair: [MB + 'exhibit.jpg', MB + 'story.jpg'] },

  { h: 'Designed and built end to end', n: '07 · Build', nav: 'Build' },
  { p: 'I built the platform myself in plain PHP and MySQL, with hand-written HTML, CSS and JavaScript — a lightweight, transparent codebase without frameworks or third-party dependencies.' },
  { steps: [['Moderation', 'Every submission enters as a draft, visible only in a password-protected curator interface until approved.'], ['Edit without accounts', 'Token-based private links let contributors return and amend their exhibit.'], ['Safe re-review', 'Editing a published exhibit returns it to the moderation queue automatically.'], ['Automated email', 'A confirmation with the private edit link is sent after every submission.']] },

  { h: 'Where it stands', n: '08 · Outcome', nav: 'Outcome' },
  { p: 'The museum is live with its first exhibits — a sister’s alarm clock, a robe that crossed Siberia, an owl felted by a mother’s hands — each with a full story, a passport and marks of time, and is open to external submissions with manual moderation. Success is measured by published stories, the share of authors who return to update a biography, and whether readers say their decision to discard or buy new changed.' },
  { swot: [
    ['Strengths', ['Works upstream — before disposal, where no existing tool operates', 'Addresses psychological causes, not only material consequences', 'Near-zero cost, solid theoretical grounding']],
    ['Weaknesses', ['Emotional attachment is hard to measure', '“Empty museum” problem at launch', 'One-person team']],
    ['Opportunities', ['Right to Repair movement', 'Repair cafés and vintage culture', 'Viral potential of personal stories']],
    ['Threats', ['Planned obsolescence remains profitable', 'New is often cheaper than repair', 'A slow format in the attention economy']],
  ] },
  { steps: [['Months 2–5', 'User accounts and “living biographies” that grow with new repairs and comments.'], ['Months 5–8', 'Thematic collections and partnerships with repair cafés.'], ['Months 8–12', 'An offline exhibition: printed object biographies as museum labels.']] },
  { big: 'Extending the life of objects is a climate strategy.' },
  { p: 'Every object not replaced means avoided emissions from the production, transport and disposal of its replacement.' },
];

// Кейс Barefoot Summer — VR-игра (GDD v5); скриншоты из игры. video — короткий ролик (добавить файл в BF).
const BF = 'assets/design/barefoot/';
const BAREFOOT_CASE = [
  { meta: [
    ['Role', 'Game design, world building, 3D characters, VR interaction, development — solo'],
    ['Platform', 'VR · Unity'],
    ['Genre', 'Free-world experience / slow game'],
    ['Context', 'HIT, Faculty of Design · Design for virtual reality'],
  ] },

  { video: [BF + 'barefoot-summer-promo-720p.webm', BF + 'barefoot-summer-promo-720p.mp4'], poster: BF + 'barefoot-summer-poster.jpg', cap: 'Promo — gameplay from the VR build' },

  { h: 'One summer day in a 1990s village', n: '01 · Concept', nav: 'Concept' },
  { img: BF + 'key-art.jpg', cap: 'Key art — the girl, her neighbour and the water barrel' },
  { p: 'Barefoot Summer is a personal VR story about one summer day in childhood. The adults have gone out, and the children have the whole day to themselves: a long wooden house, a yard, a vegetable garden, a shed, chickens, a cat, an old water barrel and a cassette player. There are no missions, no points and no correct path. As the sun moves across the sky, the light changes and the yard grows quieter. When evening comes, the day ends by itself.' },
  { quote: 'A VR experience about freedom, memory, and the small world of childhood.' },
  { pair: [BF + 'art-greenhouse.jpg', BF + 'art-chickens.jpg'] },
  { p: 'Inspirations: The Witcher (a lived-in village world), Firewatch and Night in the Woods (light and mood), What Remains of Edith Finch (personal narrative), Nostalgic Train (VR village atmosphere) and slow-game philosophy.' },

  { h: 'From memory to 3D', n: '02 · References', nav: 'References' },
  { p: 'Nothing in the game is invented. The characters, the house and the objects are rebuilt from my own childhood: family photographs, the real village, the real house where I spent my summers.' },
  { p: 'The girl — the player — is me at seven: curious, brave, the one who leads. The experience is in first person, with her small hands visible when she touches the world. Her 3D model is built from a childhood photo, down to the “Time Out” T-shirt.' },
  { pair: [BF + 'ref-girl-family.jpg', BF + 'ref-girl-photo.jpg'] },
  { img: BF + 'ref-girl-model.jpg', cap: 'The girl: childhood photo → 3D character' },
  { p: 'The neighbour is also a real person — a younger boy who lived nearby. In the game he is two years younger, has his own small life in the world and works as a soft guide. His model keeps the cap and the teddy-bear T-shirt from the photo.' },
  { img: BF + 'ref-boy-model.jpg', cap: 'The neighbour: photo → 3D character, front and side' },

  { h: 'A real house, reconstructed', n: '03 · World', nav: 'World' },
  { p: 'The world is based on a real village and the long rural house divided between three families, where I spent time as a child: a yard, a garden, small household spaces and the feeling of several lives side by side. Not a fantasy location, but a reconstruction — familiar, simple, imperfect and full of small details.' },
  { pair: [BF + 'ref-village-map.jpg', BF + 'ref-village.jpg'] },
  { img: BF + 'ref-house.jpg', narrow: true, cap: 'The house — the emotional and spatial foundation of the game world' },
  { p: 'Before modelling, I drew the plan of the yard and of the house from memory: the garden beds, the shed, the rooms, the stove, the beds and the coloured window.' },
  { img: BF + 'plan.jpg', cap: 'The plan — drawn from memory' },
  { img: BF + 'house.jpg', cap: 'In the game: the long village house, the greenhouse and the shed' },

  { h: 'Memory anchors', n: '04 · Objects', nav: 'Objects' },
  { p: 'The visual world is built from real objects I remember: an old water barrel I used to “paint” with a wet brush, a cassette player, a Brick Game, garden tools, chickens, eggs, buckets, wooden fences. They are not props — each one invites touch, play and exploration.' },
  { grid: [BF + 'obj-brush.jpg', BF + 'obj-brickgame.jpg', BF + 'obj-flowers.jpg'] },
  { pair: [BF + 'obj-barrels.jpg', BF + 'obj-cassette.jpg'] },
  { p: 'Interactive objects get a quiet invitation when the player comes close — a soft outline and a small icon: a hand to touch, an eye to look, a ring to use. Never a mission marker.' },
  { img: BF + 'interactive.jpg', cap: 'Interaction indicators: barrel, tape recorder, brush, Brick Game, bucket, door latch' },

  { h: 'No quests — only time', n: '05 · Core loop', nav: 'Core loop' },
  { p: 'The game has no quests, scores, winning or losing. The only structure is time: the sun is visible in the sky and moves through the session — cool and soft in the morning, bright at midday, golden toward evening. No clock, no timer, just the sky.' },
  { timeline: [['Memory'], ['Free exploration'], ['Soft guidance'], ['Choice'], ['Interaction'], ['World reaction'], ['Sunset', true]] },
  { pair: [BF + 'time.jpg', BF + 'flowchart.jpg'] },

  { h: 'Touch, pick, pour, play', n: '06 · Gameplay', nav: 'Gameplay' },
  { steps: [['Pick up', 'Grab objects with the VR controller — the core mechanic.'], ['Throw & scatter', 'Toss grain, drop vegetables into the basket.'], ['Swipe', 'Pet animals, paint the barrel with water.'], ['Press', 'The tape recorder and simple household objects.'], ['Approach', 'Chickens gather, the neighbour speaks.']] },
  { p: 'The neighbour suggests small things — “Want to go feed the chickens?”, “Let’s paint the barrel”, “I found something in the shed” — but never gives tasks: the player can follow, ignore or do something else, and he simply waits.' },
  { pair: [BF + 'neighbour.jpg', BF + 'garden-neighbour.jpg'] },
  { pair: [BF + 'tomatoes.jpg', BF + 'carrot.jpg'] },
  { pair: [BF + 'watering.jpg', BF + 'basket.jpg'] },
  { p: 'The world reacts: chickens run if approached too fast but gather when grain is scattered, water darkens dry soil, wet strokes on the barrel slowly dry, only ripe berries can be picked, and the cat decides for itself.' },
  { pair: [BF + 'physics.jpg', BF + 'chickens.jpg'] },

  { h: 'Morning to sunset', n: '07 · Light & sound', nav: 'Light' },
  { p: 'The palette follows the sun, and so does the music: fresh in the morning, livelier at midday, quieter and more melancholic toward evening. The tape recorder plays Soviet pop and cassettes of the 90s; the neighbour’s voice, chickens, wind, watering, the creak of the shed door and distant laughter make the village feel alive.' },
  { swatches: [['Morning', '#d6e8f0', 'cool light'], ['Morning', '#a8c5b5', 'blue shadows'], ['Midday', '#f2c94c', 'golden'], ['Midday', '#6b9e5e', 'garden'], ['Evening', '#e07b39', 'sunset'], ['Evening', '#d4956a', 'rose-gold']] },
  { pair: [BF + 'start-end.jpg', BF + 'night.jpg'] },
  { img: BF + 'evening-door.jpg', cap: 'Back home: someone calls from the house' },

  { h: 'Nine moments of a day', n: '08 · Storyboard', nav: 'Storyboard' },
  { img: BF + 'storyboard.jpg', cap: 'Storyboard: start → neighbour → explore → interact → world physics → little moments → time → sunset → back home' },

  { big: 'No victory. No failure. Just the end of one summer day.' },
];

// Кейс Sound Adventures (Sirens) — игра на развитие слухового внимания; скриншоты из рабочей версии.
const SG = 'assets/design/sound-game/';
const SOUND_CASE = [
  { meta: [
    ['Role', 'Game & UX design, illustration direction, full-stack development — solo'],
    ['Audience', 'Children 6–8 and the speech therapists who work with them'],
    ['Stack', 'p5.js, p5.sound, JavaScript, PHP, MySQL'],
    ['Scope', '9 games · learning routes · specialist dashboard · 2025'],
  ] },

  { h: 'Listening is a skill', n: '01 · Problem', nav: 'Problem' },
  { p: 'Auditory attention — noticing a sound, telling it apart from others, linking it to its source and remembering it — is the base for speech and reading. Children who struggle with it practise with speech therapists, but the exercises are repetitive, hard to do at home, and their progress is difficult to track between sessions.' },
  { quote: 'How might we turn auditory training into play — and give the specialist a clear picture of how the child listens?' },

  { h: 'A world where sounds got mixed up', n: '02 · Concept', nav: 'Concept' },
  { p: 'Sound Adventures is a browser game for children aged 6–8. In its world the sounds have gone wrong: the bus barks, the cat plays the accordion. A friendly helper guides the child along a map, and every stage is a short listening game. There is no score, no timer and no punishment for mistakes — listening and exploring are the core mechanics.' },
  { img: SG + 'main.jpg', cap: 'Start screen — the child enters a name and starts playing' },
  { img: SG + 'map.jpg', cap: 'The map: ten stages from the house to the castle; the next stage opens after the previous one' },

  { h: 'Seven directions of hearing', n: '03 · Method', nav: 'Method' },
  { p: 'Together with the logic of speech therapy, the games are built around seven areas of auditory development, from the simplest — noticing a sound — to working memory:' },
  { map: [['Detection', 'reacting when a sound appears'], ['Attention', 'sustained and selective listening'], ['Discrimination', 'comparing and telling sounds apart'], ['Association', 'matching a sound to its source'], ['Control', 'finding and fixing mistakes'], ['Memory', 'remembering a sound'], ['Working memory', 'order, rules and complex tasks']] },

  { h: 'Nine short games', n: '04 · Games', nav: 'Games' },
  { p: 'Who Sounds Wrong? — the child hovers over objects in a busy street to hear them and swaps the sounds until every object sounds right.' },
  { pair: [SG + 's1-intro.jpg', SG + 's1-street.jpg'] },
  { p: 'Sound Matching — a memory-style grid: eight sound cards and eight pictures of instruments to pair up. What Was That Sound? — press play and find who in the room made the sound.' },
  { pair: [SG + 's2-grid.jpg', SG + 's3-room.jpg'] },
  { p: 'Feed the Animals — hear which animal is hungry and drag the carrot to it. What Did Dad Do? — listen to a sequence of sounds and put the pictures in order.' },
  { pair: [SG + 's4-farm.jpg', SG + 's5-sequence.jpg'] },
  { p: 'Wake Up on Sound and Start on Sound train detection and reaction: stop the alarm within three seconds, start the car when the engine sound comes.' },
  { pair: [SG + 'wake-up.jpg', SG + 'start-on-sound.jpg'] },

  { h: 'A helper, not a judge', n: '05 · UX for kids', nav: 'UX' },
  { p: 'Every game starts with the same helper and a one-sentence rule. Feedback is gentle: a soft green glow and fireworks for a right answer, small red crosses for a wrong one — and after three mistakes in a row the helper appears with a hint instead of a penalty. Big buttons, one action per screen, a home button and a replay-sound button always in the same place.' },
  { img: SG + 'helper.jpg', narrow: true, cap: 'The helper: start, hint after mistakes, success' },
  { steps: [['No failure state', 'Mistakes are logged, never punished.'], ['Hover to listen', 'Sounds play on hover, throttled so they never overlap.'], ['Same controls everywhere', 'Home and replay in a fixed place on every stage.'], ['Hints on struggle', 'The helper appears after three wrong attempts in a row.']] },

  { h: 'Built for the specialist too', n: '06 · Specialist tools', nav: 'Specialist' },
  { p: 'Behind the game is a portal for speech therapists. It is not just a report: the specialist shapes the training for each child.' },
  { img: SG + 'dash-overview.jpg', cap: 'Specialist dashboard — students, sessions, completion, average mistakes and the sounds children confuse most' },
  { steps: [
    ['Personal learning routes', 'The specialist builds each child’s own path — up to ten stages, chosen and ordered by the child’s needs and goals. The map shows the child exactly this route; the next stage opens when the previous one is completed.'],
    ['Game Lab — your own mini-games', 'Twelve game mechanics are built into the platform, grouped by the seven directions of hearing. The specialist picks a mechanic, chooses the sounds and pictures, the number of items and the scene background — and saves it as a new mini-game.'],
    ['Your own cards', 'A gallery of cards, each a picture paired with a sound, sorted by category and playable right in the portal. The specialist can add their own images to build games around the words and situations that matter to a particular child.'],
    ['Assign and track', 'Saved games are assigned to children and placed into routes; every session records time, mistakes — what was confused with what — and how often the helper was needed.'],
  ] },
  { img: SG + 'dash-route.jpg', cap: 'Route builder — the specialist picks saved games and orders them into a personal route of up to ten stages' },
  { img: SG + 'dash-gamelab.jpg', cap: 'Game Lab — twelve built-in mechanics, filtered by the seven directions of hearing' },
  { pair: [SG + 'dash-gamelab-config.jpg', SG + 'dash-gallery.jpg'] },
  { pair: [SG + 'dash-participants.jpg', SG + 'dash-profile.jpg'] },
  { p: 'Left to right: configuring a mechanic and saving it as a blueprint; the card gallery, every picture paired with its sound; the caseload with each child’s stage and assigned games; a child profile with family link and learning routes.' },
  { p: 'The overview shows students, sessions, completion rate, average mistakes and who needs attention; “problem objects” show which sounds confuse children most.' },

  { h: 'Designed and built end to end', n: '07 · Build', nav: 'Build' },
  { p: 'The whole project is mine — concept, game and UX design, illustration direction and code: the scenes in p5.js and p5.sound with a responsive canvas and percentage-based object layout from Figma; a PHP and MySQL back end that logs sessions, solves and mistakes; and the specialist portal with Game Lab, card gallery, assignments and learning routes. The same game engine plays both the ready-made stages and every mini-game a therapist builds.' },

  { big: 'Listening first. No score, no timer — just sounds put back in their place.' },
];

// Экран Design: проекты из портфолио. Карточки (src) появляются, когда стены разлетаются,
// кружат вокруг фигуры, а в финале каждая улетает в свою доску из панелей грида —
// на доске (board, картинка 2:1, режется на 4 × 2 панели) работа видна целиком.
// Порядок = порядок досок финала (CLUSTERS в world.js): 1 сверху по центру, 2 сверху справа,
// 3 справа, 4 снизу справа, 5 снизу слева от фигуры, 6 в левом верхнем углу, 7 в правом верхнем.
// look — оформление окна: bg/ink — цвет героя и заголовка, lines — строки заголовка («*» — контуром),
//   full: true — фото на весь блок, заголовок поверх; titleAt — где начинается колонка заголовка (доля ширины), wire: true — нарисовать проволоку; kind, place, headline, lede. Главы — блоки { h } в кейсе/галерее (ссылки в блоке концепции).
// gallery — картинки в окне проекта (те же блоки, что в кейсах; img + narrow: true — картинка поуже).
// Картинки — из «תיק עבודות.pdf» и кейса UX/UI (assets/design/).
// text и tags — для окна, которое открывается по клику на работу. colors — для заглушки, если картинки нет.
// Кейс «Education for Innovation» (Peres Center): система целиком, моя часть — дашборд инструктора.
// Скрины дашборда — из peres-webapp (React), слайды — из презентации «תוכנית תהליכית - הגשה.pdf».
const PE = 'assets/design/peres/';
const PERES_CASE = [
  { meta: [
    ['My role', 'Instructor dashboard: UX/UI design with Liran Amar, front-end development; system concept with the team'],
    ['Team', 'Michal Sari, Nataliya Toumarkin, Dania Altman, Liran Amar'],
    ['Stack', 'React 19, TypeScript, React Router, Vite, CSS Modules'],
    ['Context', 'Peres Center for Peace & Innovation · HIT M.Des, Collaborative Studio 2 · 2026'],
  ] },

  { h: 'Four meetings, a lot of friction', n: '01 · Problem', nav: 'Problem' },
  { p: 'Education for Innovation is the Peres Center’s flagship programme for middle and high schools: four two-hour meetings in which a class turns a problem into a team, an idea and a pitch. The audience is sharp, wildly creative and eager to prove itself — and at the same time has a short attention span, a phone full of distractions and close to zero commitment to anything that feels like homework.' },
  { quote: 'How might we lower the barriers and raise motivation for young participants throughout the workshop?' },

  { h: 'What gets in the way', n: '02 · Research', nav: 'Research' },
  { p: 'We observed workshops in schools and talked to instructors, teachers and students. Every observation went on a sticky note; the notes grouped into five barriers.' },
  { img: PE + 'deck-research.jpg', cap: 'Field notes from the workshops' },
  { steps: [
    ['No preparation in advance', 'Instructors meet the class for the first time on the day — no profiles, no context, no idea who works with whom.'],
    ['iPads don’t always work', 'Shared tablets freeze and need recharging; students drift back to their own phones.'],
    ['Too many platforms', 'Files live in phones, chats, AI tools and folders of other schools; finding your own work eats the meeting.'],
    ['Low motivation', 'Without a trigger before the day and a story during it, the activity feels confusing and optional.'],
    ['Nothing after the workshop', 'Four meetings end with a paper certificate — no follow-up, no community, no next step.'],
  ] },

  { h: 'Behaviour = Motivation × Ability × Trigger', n: '03 · Method', nav: 'Method' },
  { p: 'We used the Fogg Behavior Model. Motivation: teenagers respond to social connection, recognition and play — points, badges, likes, topics they care about. Ability: every task is a micro-step in plain language. Trigger: teens forget, so the system reminds them — positively, never as a nag.' },
  { img: PE + 'deck-bmat.jpg', cap: 'B = MAT: tasks above the action line get done when a trigger arrives' },

  { h: 'One ecosystem instead of five tools', n: '04 · Solution', nav: 'Solution' },
  { p: 'The answer is a single digital ecosystem that connects everyone involved: the Peres Center, the instructor’s dashboard, a student app on the students’ own phones (bring your own device), a shared class drive and short social content that keeps the story going between meetings.' },
  { img: PE + 'deck-ecosystem.jpg', cap: 'The system: dashboard, student app, shared drive, social' },
  { steps: [
    ['Three weeks before', 'The Peres Center asks the school for the class list; the instructor enters the workshop, schedules it and gets assigned.'],
    ['Two weeks before', 'A message goes to the homeroom teacher with the instructions and the join link.'],
    ['One week before', 'Students join the app and take the “Dream Team” quiz that reveals their entrepreneur type — and builds curiosity for the day.'],
    ['Workshop day', 'The instructor runs the meeting from the dashboard; students follow missions in the app and upload their work.'],
    ['Between meetings', 'Short weekly missions and “the hub” keep the team together until the next meeting — and after the last one.'],
  ] },
  { pair: [PE + 'deck-invite.jpg', PE + 'deck-day.jpg'] },
  { img: PE + 'app-onboarding.jpg', narrow: true, cap: 'Student app (developed by Dania Altman): welcome, sign-in and the entrepreneur-type quiz' },

  { h: 'My part: the instructor dashboard', n: '05 · Dashboard', nav: 'Dashboard' },
  { p: 'The web app instructors use before, during and after every meeting — in Hebrew, right to left. I designed it together with Liran Amar and built it myself. It turns the five barriers into one calm workflow: know the class before you arrive, run the room from one screen, and keep everything the teams make in one place.' },
  { img: PE + 'dash-home.jpg', cap: 'Home — today’s meeting, personal statistics, tasks and live updates from the class drive' },
  { img: PE + 'dash-overview.jpg', cap: 'Workshop hub — upcoming workshops, the next meeting and a readiness checklist' },
  { steps: [
    ['Import and invite', 'Upload the class list from Excel, check the columns and data, send the join link to the teacher — and see who has joined the app, who opened the link and who needs help.'],
    ['From quiz to teams', 'Quiz results show each student’s main and secondary entrepreneur type. The system drafts balanced teams of 3–6 by type; the instructor moves people, assigns the rest and only then publishes.'],
    ['Live session mode', 'Team progress, connected students, help requests, the session task list and a timer — and one button to show a lesson slide, the timer or a team’s work on the classroom screen.'],
    ['Messages and tasks', 'Send a message or publish a task to the whole class or one team; it appears in the app instantly and stays in the workshop history.'],
    ['Class drive', 'Every team’s photos, voice notes, videos and documents in one place, filtered by school, team and date.'],
  ] },
  { pair: [PE + 'dash-participants.jpg', PE + 'dash-questionnaire.jpg'] },
  { img: PE + 'dash-groups.jpg', cap: 'Team split — an automatic draft by entrepreneur type that the instructor fine-tunes before publishing' },
  { img: PE + 'dash-live.jpg', cap: 'Live session — teams, alerts and tasks for “Team Power”, meeting 2 of 4' },
  { img: PE + 'dash-broadcast.jpg', cap: 'Lesson aids — pick a page and show it on the classroom screen; the header shows what is on air' },
  { pair: [PE + 'dash-communication.jpg', PE + 'dash-drive.jpg'] },

  { h: 'Barriers, answered', n: '06 · Outcome', nav: 'Outcome' },
  { img: PE + 'deck-solutions.jpg', cap: 'Each barrier and the part of the system that answers it' },
];

export const DESIGN_PROJECTS = [
  { title: 'Early Birds', cat: 'graphic', sub: 'branding · kids cycling', src: 'assets/design/early-birds-card.jpg', board: 'assets/design/early-birds-board.jpg', hero: 'assets/design/early-birds/hero.jpg', text: 'Branding for a school that teaches little kids to ride a bike. The symbol is a small bird — an “early bird”: a child who learns an important skill early and becomes more independent. Classic pink and blue.', tags: ['logo', 'T-shirt', 'badge', 'bike baskets'],
    gallery: [{ h: 'Bike accessories' }, { p: 'Pink and blue bike baskets with the Early Birds badge — they are on the cover above.' }, { h: 'T-shirts' }, { img: 'assets/design/early-birds-board.jpg', cap: 'A bike can take you anywhere' }],
    look: { bg: '#7fd0f0', ink: '#1b2654', text: '#1b2654', full: true, titleAt: 0.64, kind: 'Branding', lines: ['Early', 'Birds*'], headline: 'Small riders. Big independence.', lede: 'Branding for a school that teaches little kids to ride a bike — the “early bird” who learns an important skill early and grows more independent.' },
    colors: ['#bfe6f7', '#16263f', '#f19bb4'] },
  { title: 'Future EDU', cat: 'graphic', sub: 'logo · posters · illustration', src: 'assets/design/future-edu-card.jpg', hero: 'assets/design/future-edu/hero.jpg', board: 'assets/design/future-edu-board.jpg', text: 'Posters for the “Education for the Future” program: high-school students spend six months on an orbital station, take part in international research on the ISS, and get benefits on their final exams when they return. Vector illustrations and eye-catching typography.', tags: ['logo', 'posters', 'vector illustration', 'typography'],
    look: { bg: '#0f1a36', ink: '#f6c445', full: true, titleAt: 0.7, kind: 'Logo & poster series', lines: ['Future', 'EDU*'], headline: 'Your journey to the future.', lede: 'Posters for a program that sends high-school students to an orbital station for six months of research on the ISS. Retro-space vector illustration and bold Hebrew type.' },
    gallery: [{ h: 'Logo' },
      { p: 'The identity starts from the logo: a faceted crystal built from triangles — a planet, a satellite and a cut gem at once, the idea of an education that has many sides. Next to it, a slanted heavy italic wordmark FUTURE EDU, set as if in motion, and the slogan “path to success”. A compact version of the logo sits on every poster.' },
      { img: 'assets/design/future-edu/logo-navy.jpg', narrow: true },
      { h: 'Posters' }, { img: 'assets/design/future-edu/wall.jpg' }],
    colors: ['#16213a', '#f6c445', '#e8445d'] },
  { title: 'Bank Hapoalim', cat: 'product', sub: 'UX/UI · credit card application flow', src: 'assets/design/bank-app-card.jpg', board: 'assets/design/bank-app-board.jpg',
    hero: 'assets/design/hapoalim/hero-flow.jpg', caseStudy: HAPOALIM_CASE,
    text: 'A credit card application flow for a banking app.', tags: ['UX/UI', 'mobile app', 'A/B testing', 'prototype'],
    look: { bg: '#fbeeee', ink: '#c8202a', text: '#2a1a1c', full: true, titleAt: 0.66, titleTop: true, kind: 'UX/UI case study', lines: ['Bank', 'Hapoalim*'], place: 'Google × Reichman Tech School', headline: 'Choosing a credit card, made personal.', lede: 'A redesigned card application flow: users pick their interests, and the app suggests the cards that fit — tested with 20+ people in an A/B study.' },
    colors: ['#f8d4d4', '#ffffff', '#d4202a'] },
  { title: 'Oxxxymiron', cat: 'graphic', sub: 'album · CD packaging', src: 'assets/design/oxxxymiron-card.jpg', board: 'assets/design/oxxxymiron-board.jpg', hero: 'assets/design/oxxxymiron/hero-cd.jpg', heroRatio: '1774 / 887', text: 'Packaging for the album “Beauty and Ugliness” by Oxxxymiron, one of the central figures of modern Russian hip-hop. Collages built on the contrast of black-and-white photography and orange. The project includes CD packaging, a lyrics booklet, concert tickets and stationery.', tags: ['CD packaging', 'booklet', 'concert tickets', 'stationery'],
    gallery: [{ h: 'CD packaging' }, { img: 'assets/design/oxxxymiron/cd.jpg' }, { img: 'assets/design/oxxxymiron/booklets.jpg' }, { h: 'Tickets & stationery' }, { img: 'assets/design/oxxxymiron/stationery.jpg', cap: 'Concert tickets, business cards, envelope' },
      { h: 'Lyrics booklet' }, { p: 'Lyrics booklet: every song is a collage — black-and-white photography over a coral circle, hand-drawn lettering.' },
      { grid: ['assets/design/oxxxymiron/page-01.jpg', 'assets/design/oxxxymiron/page-04.jpg', 'assets/design/oxxxymiron/page-02.jpg'] }, { grid: ['assets/design/oxxxymiron/page-07.jpg', 'assets/design/oxxxymiron/page-08.jpg', 'assets/design/oxxxymiron/page-10.jpg'] }],
    look: { bg: '#2e2b29', ink: '#f07a3a', full: true, titleAt: 0.72, titleScale: 0.7, kind: 'Album packaging', lines: ['Oxxxy', 'miron*'], place: 'Beauty & Ugliness · 2019', headline: 'Beauty and ugliness, side by side.', lede: 'Packaging for the album by one of the central figures of Russian hip-hop: collages that put black-and-white photography against a coral circle.' },
    colors: ['#3b3734', '#f3efe9', '#f07a3a'] },
  { title: 'Belladonna Publishing', cat: 'graphic', sub: 'brand identity · book collection · box set', src: 'assets/design/belladonna-card.jpg', hero: BD + 'hero-frame.jpg', caseStudy: BELLADONNA_CASE, accent: '#8d545b', board: 'assets/design/belladonna-board.jpg', text: 'A publisher of classic English detective fiction. The first series is Agatha Christie’s Hercule Poirot novels.', tags: ['brand identity', 'book collection', 'cover illustration', 'box set', 'posters', 'stationery'],
    look: { bg: '#5f7680', ink: '#f4e0c3', full: true, titleAt: 0.72, kind: 'Brand & book collection', lines: ['Bella', 'donna*', 'Publishing'], place: 'Shenkar · 2024', headline: 'An ode to the classics.', lede: 'A full publishing project: the identity of a publisher of classic English detective fiction and its first collection — ten Hercule Poirot novels with illustrated collage covers, a box set, posters and stationery.' },
    colors: ['#6f8593', '#f3e6cc', '#1c1c1c'] },
  { title: 'Barbed Wire Museum', cat: 'graphic', sub: 'logo · identity · packaging', src: 'assets/design/barbed-wire-card.jpg', hero: 'assets/design/barbed-wire/hero.jpg', heroRatio: '4795 / 2433', board: 'assets/design/barbed-wire-board.jpg', text: 'Identity for the Barbed Wire Museum in Kansas. A typeface made of twisted wire and vector illustrations about its role in US history: World War I, farming, wild animals. Packaging with plastic parts that change size.', tags: ['logo', 'typeface', 'packaging', 'posters', 'T-shirts'],
    gallery: [{ h: 'Logo' },
      { p: 'The mark is a strip of barbed wire drawn as a gesture: a few sharp diagonal strokes caught on one taut line — the wire twisted around fence posts. It sits in a solid square next to a hand-lettered, brush-like wordmark KANSAS BARBED WIRE MUSEUM, set in Lullabies: rough, energetic, a little wild, like the prairie it comes from.' },
      { img: 'assets/design/barbed-wire/logo-main.jpg', small: true },
      { p: 'The logo lives in black and white — positive and negative — and in the brand colors: magenta, and yellow on black. It is built on a modular grid (the square to text ratio is 38 : 76 units) and has three sizes: the full version from 2.6 × 1.2 cm, the wordmark from 1.5 cm, and the mark alone down to 0.5 cm.' },
      { logos: ['assets/design/barbed-wire/logo-positive.jpg', 'assets/design/barbed-wire/logo-negative.jpg', 'assets/design/barbed-wire/logo-magenta.jpg', 'assets/design/barbed-wire/logo-yellow.jpg'] },
      { img: 'assets/design/barbed-wire/logo-grid.jpg', small: true, cap: 'Construction grid: square 38 units, text block 76 units' },
      { h: 'Identity' }, { p: 'A typeface made of twisted wire and vector illustrations about the role of barbed wire in US history: World War I, farming, wild animals.' }, { h: 'Packaging' }, { p: 'Boxes and tubes with plastic parts that change size.' }, { img: 'assets/design/barbed-wire/packaging.jpg' }, { h: 'Posters' }, { img: 'assets/design/barbed-wire/posters.jpg' }, { h: 'Apparel' }, { img: 'assets/design/barbed-wire/tshirts.jpg' }],
    look: { bg: '#e0119a', ink: '#f4f000', full: true, titleAt: 0.73, kind: 'Visual identity', lines: ['Barbed', 'Wire*', 'Museum'], place: 'Kansas, USA', headline: 'Twisted wire. Unexpected stories.', lede: 'A museum identity built around custom typography, bold illustration, and adaptable packaging.' },
    colors: ['#f4e61c', '#141414', '#d4148f'] },
  { title: 'Buryat Food & Culture', cat: 'graphic', sub: 'editorial design · booklet · 2024', src: 'assets/design/buryat-card.jpg', board: 'assets/design/buryat-board.jpg', hero: 'assets/design/buryat/hero-yurt.jpg',
    text: 'A 36-page booklet in Hebrew about the culture and cuisine of the Buryats — the people of Lake Baikal, where I was born and grew up. Every chapter opens with a photo cut by a Buryat ornament; inside, line illustrations in two colors, maps, recipes and stories: Lake Baikal, healing herbs, omul fish, the yurt and the Buryat calendar, “white food”, milk vodka, national costume, meat dishes and salted tea.',
    tags: ['editorial design', 'illustration', 'layout', 'Hebrew typography'],
    gallery: [{ h: 'Spreads' }, { img: 'assets/design/buryat/mockup.jpg' },
      { h: 'Chapter openers' }, { p: 'Chapter openers: a photo seen through a cut-out ornament.' },
      { grid: ['assets/design/buryat/page-04.jpg', 'assets/design/buryat/page-08.jpg', 'assets/design/buryat/page-10.jpg'] }, { grid: ['assets/design/buryat/page-14.jpg', 'assets/design/buryat/page-18.jpg', 'assets/design/buryat/page-24.jpg'] },
      { grid: ['assets/design/buryat/page-28.jpg', 'assets/design/buryat/page-32.jpg', 'assets/design/buryat/page-02.jpg'] },
      { h: 'Inside pages' }, { p: 'Inside: maps, line illustrations, recipes and photo pages.' },
      { grid: ['assets/design/buryat/page-16.jpg', 'assets/design/buryat/page-17.jpg', 'assets/design/buryat/page-11.jpg'] }, { grid: ['assets/design/buryat/page-19.jpg', 'assets/design/buryat/page-25.jpg', 'assets/design/buryat/page-29.jpg'] },
      { grid: ['assets/design/buryat/page-07.jpg', 'assets/design/buryat/page-15.jpg', 'assets/design/buryat/page-30.jpg'] }],
    look: { bg: '#efe4d6', ink: '#d3203a', text: '#2a1a1c', full: true, titleAt: 0.61, titleScale: 0.62, kind: 'Editorial design', lines: ['Buryat', 'Food &*', 'Culture'], place: 'Lake Baikal · 2024', headline: 'Secrets of Buryat culture and cuisine.', lede: 'A 36-page booklet about the people of Lake Baikal, where I was born and grew up: stories, maps, line illustrations and recipes.' },
    colors: ['#d3203a', '#ffffff', '#f2e9df'] },
  { title: 'The Museum of Beloved Things', cat: ['product', 'code'], sub: 'UX/UI · web platform · PHP & MySQL', src: 'assets/design/museum-card.jpg', board: 'assets/design/museum-board.jpg', hero: MB + 'hero-bear.jpg',
    caseStudy: MUSEUM_CASE, accent: '#c8a35a', link: 'https://museum.toumarkin.com',
    text: 'A web museum for the objects people keep, repair and continue to use.', tags: ['UX research', 'UI design', 'full-stack development', 'circular design'],
    look: { bg: '#2a211b', ink: '#c8a35a', full: true, titleAt: 0.56, titleScale: 0.7, titleTop: true, kind: 'UX/UI design & code', lines: ['Museum of', 'Beloved*', 'Things'], place: 'HIT · 2026 · live', headline: 'Designing for emotional durability.', lede: 'A live web platform where anyone can exhibit an object they kept, repaired and still use — its photographs, story and biography. An upstream intervention in the circular economy: the pause before something becomes waste.' },
    colors: ['#1c1916', '#f1e8d8', '#c8a35a'] },
  { title: 'Barefoot Summer', cat: ['game', 'code'], sub: 'VR game · game design · Unity', src: 'assets/design/barefoot-card.jpg', board: 'assets/design/barefoot-board.jpg', hero: BF + 'hero-yard.jpg',
    caseStudy: BAREFOOT_CASE, accent: '#c98a2b',
    text: 'A VR slow game about one summer day in a 1990s village.', tags: ['game design', 'VR', 'Unity', 'world building', 'interaction design'],
    look: { bg: '#1f3a1c', ink: '#f2c94c', full: true, titleAt: 0.68, titleScale: 0.8, kind: 'VR game design & development', lines: ['Barefoot', 'Summer*'], place: 'VR · Unity · 2026', headline: 'A day that belongs to you.', lede: 'A free-world VR experience built from my own childhood: no quests, no score, no correct path — just a village yard, a friend nearby and the sun slowly crossing the sky. I designed and built the whole game.' },
    colors: ['#24321f', '#f2c94c', '#e07b39'] },
  { title: 'Sound Adventures', cat: ['game', 'product', 'code'], sub: 'educational game · UX/UI · full stack', src: 'assets/design/sound-game-card.jpg', board: 'assets/design/sound-game-board.jpg', hero: SG + 'hero-forest.jpg', heroRatio: '1774 / 887',
    caseStudy: SOUND_CASE, accent: '#e98a10', link: 'https://soundgame.toumarkin.com/index.html',
    text: 'A browser game that trains auditory attention in children aged 6–8, with a dashboard for speech therapists.', tags: ['game design', 'UX for kids', 'p5.js', 'PHP & MySQL', 'dashboard'],
    look: { bg: '#035940', ink: '#ffd84a', full: true, titleAt: 0.66, titleScale: 0.8, kind: 'Educational game & platform', lines: ['Sound', 'Adventures*'], place: '2025 · ages 6–8 · auditory attention', headline: 'Listening, turned into play.', lede: 'Nine short games that train a child to notice, tell apart, match and remember sounds — and a portal where speech therapists build a personal learning route for each child and create their own mini-games from built-in mechanics and their own cards.' },
    colors: ['#2f7a3b', '#ffd84a', '#e98a10'] },
  { title: 'Education for Innovation', cat: ['product', 'code'], sub: 'Peres Center · dashboard · UX/UI · React', src: PE + 'hero.jpg', hero: PE + 'hero.jpg', heroRatio: '2400 / 1200',
    caseStudy: PERES_CASE, accent: '#1f3fc4',
    text: 'A digital ecosystem for the Peres Center’s four-meeting innovation workshop in schools. My part — the instructor dashboard: class import, quiz-based teams, live session mode with a classroom screen, messages and a shared drive.', tags: ['UX/UI', 'dashboard', 'React', 'TypeScript', 'RTL'],
    look: { bg: '#14318f', ink: '#e6ff00', full: true, titleAt: 0.67, titleScale: 0.8, kind: 'UX/UI & front-end · team project', lines: ['Education for', 'Innovation*'], place: 'Peres Center · HIT · 2026', headline: 'One system for the whole workshop.', lede: 'Teenagers, four meetings and a lot of friction. We designed an ecosystem that connects the Peres Center, instructors, teachers and students — and its heart, the instructor dashboard, I designed with Liran Amar and built.' },
    colors: ['#14318f', '#ffffff', '#e6ff00'] },
];

// Ширина наплыва при смене позы/лица (в долях stage)
export const CROSSFADE = 0.06;

// Рост фигуры в единицах сцены (комната 10 × 8 × 18)
export const FIGURE_HEIGHT = 3.4;
