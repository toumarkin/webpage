// =====================================================================
//  НАСТРОЙКИ. Всё, что обычно хочется поменять, собрано здесь.
//  Прокрутка превращается в число «stage» от 0 до 5:
//  0 = Order, 1 = Descent, 2 = Distortion, 3 = Break, 4 = Fragments, 5 = Own rules.
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
const NAME = { size: 200, weight: 700, lh: 0.96, track: -0.025 };
const BODY = { size: 72, weight: 400, lh: 1.2 };
export const WALL_TEXT = [
  { // имя и роль — задняя стена, слева от фигуры
    lines: [
      { ...NAME, text: 'Nataliya' },
      { ...NAME, text: 'Toumarkin' },
      { ...BODY, text: 'Product Designer', gap: 70 },
      { ...BODY, text: '& Web Developer' },
    ],
    width: 4.2,
    wall: [-2.5, 2.1, -9.85], wallRot: [0, 0, 0],
    fly: [-2.8, 3.0, -5.5], flyRot: [0.2, 0.5, -0.15],
    final: [-2.9, 2.2, -1.6], finalRot: [0, 0.3, -0.04], finalScale: 0.62,
    breakAt: 0.56,
  },
  { // слоган — левая стена
    lines: [
      { ...BODY, text: 'Turning ideas into' },
      { ...BODY, text: 'meaningful digital' },
      { ...BODY, text: 'experiences.' },
    ],
    width: 2.3,
    wall: [-4.9, 1.6, -1.7], wallRot: [0, Math.PI / 2, 0],
    fly: [-4.2, 0.4, -2.8], flyRot: [0.3, 0.9, 0.2],
    final: [-3.3, 0.05, 0.8], finalRot: [0, 0.4, 0.04], finalScale: 0.8,
    breakAt: 0.48,
  },
  { // город и почта — правая стена
    lines: [
      { ...BODY, text: 'Ramat Gan, Israel' },
      { ...BODY, text: 'toumarkinn@gmail.com', gap: 6 },
    ],
    width: 2.6,
    wall: [4.9, 0.6, -1.2], wallRot: [0, -Math.PI / 2, 0],
    fly: [4.2, -0.8, -2.6], flyRot: [-0.2, -0.9, -0.1],
    final: [3.1, 1.3, -0.6], finalRot: [0, -0.4, -0.03], finalScale: 0.8,
    breakAt: 0.5,
  },
];

// Подписи кадров: [название, описание под номером]
export const STAGES = [
  ['Order', 'Идеальный перспективный грид: одна точка схода, ровная сетка, ясная иерархия.'],
  ['Descent', 'Пол под ногами трескается. Фигура опускает взгляд.'],
  ['Distortion', 'Пространство гнётся и закручивается. Фигура ловит равновесие.'],
  ['Break', 'Панели отрываются от стен. Фигура поднимает руки.'],
  ['Fragments', 'Осколки сетки и записки парят вокруг. Фигура тянется к одному из них.'],
  ['Own rules', 'Обломки собираются в новый порядок по своим правилам. Появляется цвет.'],
];

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

// Записки/сканы, которые летают на кадре Fragments (до 6 штук).
// Положите файлы в assets/notes/ и перечислите их здесь, например:
//   export const NOTES = ['assets/notes/note-1.jpg', 'assets/notes/note-2.png'];
// Пустые места остаются серыми заглушками.
export const NOTES = [];

// Ширина наплыва при смене позы/лица (в долях stage)
export const CROSSFADE = 0.06;

// Рост фигуры в единицах сцены (комната 10 × 8 × 18)
export const FIGURE_HEIGHT = 3.4;
