// Модуль геометрии корпуса Yumebana One.
// Подключать ПОСЛЕ three.min.js. Добавляет в window одну функцию:
//   window.buildCase — строит и возвращает 3D-модель корпуса
(function () {
  'use strict';

  // ── Материалы (модульного уровня — создаются один раз, шарятся между всеми моделями) ──
  // MeshStandardMaterial — физически корректный материал с отражениями.
  // roughness: 0 = зеркало, 1 = полностью матовый
  // metalness: 0 = пластик/краска, 1 = металл
  const mWhite = new THREE.MeshStandardMaterial({ color: 0xf4f4f1, roughness: 0.20, metalness: 0.03 }); // белый корпус
  const mFrame = new THREE.MeshStandardMaterial({ color: 0x0f0f0e, roughness: 0.50, metalness: 0.10 }); // чёрная рамка
  const mRubber= new THREE.MeshStandardMaterial({ color: 0x0d0d0c, roughness: 0.98 }); // резиновые ножки
  // MeshPhysicalMaterial — расширенный материал, умеет делать прозрачное стекло
  const mGlass = new THREE.MeshPhysicalMaterial({
    color: 0x111111,       // тёмная тонировка
    roughness: 0.1,        // едва уловимая шероховатость — добавляет «дышащий» отклик на свет, но не превращает стекло в матовое
    metalness: 0.0,
    specularIntensity: 0,  // убирает точечные блики от ламп (KHR_materials_specular, Three.js ≥ r144)
    transparent: true,
    opacity: 0.25,         // почти прозрачное — 25% непрозрачности
    reflectivity: 0.85,    // сильное отражение
    side: THREE.DoubleSide, // отрисовывается с обеих сторон
    depthWrite: false,     // стекло не мешает отрисовке объектов за ним
  });

  // ─────────────────────────────────────────────────────────
  // Строит полную 3D-модель корпуса и возвращает THREE.Group —
  // контейнер, в котором собраны все детали корпуса.
  // ─────────────────────────────────────────────────────────
  function buildCase() {
    // Group — это «пустой объект-контейнер». Все детали добавляются в него,
    // и потом можно вращать/двигать всю модель целиком через этот объект.
    const g = new THREE.Group();

    // Габариты корпуса (в условных единицах Three.js, не в мм)
    const W = 1.00;  // ширина (Width)
    const H = 2.20;  // высота (Height)
    const D = 2.00;  // глубина (Depth)
    const T = 0.02; // толщина стенки (Thickness) — одна «пластина»

    // ── Ключевые координаты по вертикальной оси Y ──
    // В Three.js Y=0 — центр сцены. +Y вверх, −Y вниз.
    // Корпус занимает от −H/2 до +H/2 по высоте.

    const TOP_Y   = H / 2 - T / 2;  // центр верхней крышки
    const INNER_T = H / 2 - T;      // внутренняя поверхность крышки (потолок)

    // Нижняя глухая зона корпуса (нет стекла) — нижние 25% высоты
    const BASE_H       = H * 0.25;          // высота глухой нижней части
    const GLASS_BOTTOM = -H / 2 + BASE_H;   // Y, где начинается стеклянная зона
    const GLASS_H      = INNER_T - GLASS_BOTTOM; // высота стеклянной зоны
    const GLASS_CY     = (GLASS_BOTTOM + INNER_T) / 2; // центр стеклянной зоны по Y

    const FR = 0.12; // ширина рамки вокруг стеклянных панелей (Frame Rail)

    // ── Вспомогательная функция-сокращение ──
    // Вместо того чтобы каждый раз писать 5 строк для создания детали,
    // вызываем b(...) — она создаёт коробку (box), ставит её на место и
    // добавляет в группу g.
    // Параметры: w/h/d — ширина/высота/глубина, mat — материал, x/y/z — позиция
    function b(w, h, d, mat, x, y, z) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      m.position.set(x, y, z);
      g.add(m);
      return m;
    }

    // ── ВНЕШНЯЯ ОБОЛОЧКА ──
    // Координата X: −W/2 = левый край, +W/2 = правый край
    // Координата Z: −D/2 = задняя стенка, +D/2 = передняя панель
    b(W, T,       D,     mWhite, 0,           TOP_Y, 0);          // верхняя крышка
    // Намеренно цельный кубоид: фронт + дно + левая нижняя зона объединены в один блок.
    // Внутрь пустоту не вырезаем — глухая зона всё равно скрыта стеклянной зоной выше; экономим 3 меша.
    // Если позже захочется добавить интерьер (мать, каркас) внутри глухой зоны — этот блок придётся разбить на отдельные стенки.
    b(W, BASE_H,  D,     mWhite, 0, -H/2 + BASE_H/2, 0);          // основание — цельный блок (дно + передняя + левая зона)
    b(W, GLASS_H, T,     mFrame, 0,          GLASS_CY, -D/2 + T/2); // задняя стенка (только стеклянная зона)
    b(T, GLASS_H, D - T, mWhite, W/2 - T/2, GLASS_CY,  T/2);       // правая боковина (только стеклянная зона)

    // ── РАМКИ ВОКРУГ СТЕКЛЯННЫХ ПАНЕЛЕЙ ──
    // Четыре тёмные полосы: по две сверху и снизу каждого стеклянного окна.
    // TOP_RAIL_CY / BOT_RAIL_CY — центры верхней и нижней полос по Y.
    const RAIL_DEPTH    = T * 0.6;                  // визуальная толщина рамки — тоньше стенки
    // RAIL_INSET подобран так, чтобы внутренняя грань рамки совпала с внутренней гранью стекла: RAIL_INSET = T + RAIL_DEPTH/2.
    const RAIL_INSET    = T * 1.3;                  // отступ центра рамки от внешней грани
    const FRONT_RAIL_W  = W - 2 * RAIL_INSET;
    const FRONT_RAIL_CX = (RAIL_INSET + RAIL_DEPTH/2 - T) / 2; // X-центр: середина между правой гранью левой рамки и внутренней гранью правой стенки
    const FRONT_RAIL_Z  =  D/2 - RAIL_INSET;        // Z-центр передней рамки
    const LEFT_RAIL_X   = -W/2 + RAIL_INSET;        // X-центр левой рамки
    const LEFT_RAIL_Z   = 0;
    const LEFT_RAIL_D   = D - 2 * T;                // от задней стенки до переднего стекла
    b(FRONT_RAIL_W, FR, RAIL_DEPTH, mFrame, FRONT_RAIL_CX, INNER_T - FR/2,      FRONT_RAIL_Z); // верх — передняя
    b(RAIL_DEPTH, FR, LEFT_RAIL_D,  mFrame, LEFT_RAIL_X,   INNER_T - FR/2,      LEFT_RAIL_Z);  // верх — левая
    b(FRONT_RAIL_W, FR, RAIL_DEPTH, mFrame, FRONT_RAIL_CX, GLASS_BOTTOM + FR/2, FRONT_RAIL_Z); // низ — передняя
    b(RAIL_DEPTH, FR, LEFT_RAIL_D,  mFrame, LEFT_RAIL_X,   GLASS_BOTTOM + FR/2, LEFT_RAIL_Z);  // низ — левая
    b(RAIL_DEPTH, GLASS_H - 2*FR, FR,         mFrame, LEFT_RAIL_X,    GLASS_CY, -D/2 + T + FR/2); // вертикальная — вдоль левого стекла, задний торец
    b(FR,         GLASS_H - 2*FR, RAIL_DEPTH, mFrame, W/2 - T - FR/2, GLASS_CY, FRONT_RAIL_Z);    // вертикальная — вдоль переднего стекла, правый торец

    // ── СТЕКЛЯННЫЕ ПАНЕЛИ ──
    // Обе панели одинаковой толщины T.
    b(T,       GLASS_H, D - T, mGlass, -W/2 + T/2, GLASS_CY, T/2);       // левое боковое стекло
    b(W - 2*T, GLASS_H, T,     mGlass,  0,          GLASS_CY, D/2 - T/2); // переднее стекло

    // ── НОЖКИ ──
    // Четыре резиновые квадратные накладки в углах дна.
    // Массив содержит пары [x, z] — позиции ножек.
    const FOOT_W  = 0.14;     // ширина ножки (по X)
    const FOOT_H  = 0.06;     // высота ножки (по Y)
    const FOOT_D  = 0.20;     // глубина ножки (по Z)
    const FOOT_XR = 0.38;     // отступ по X как доля ширины корпуса
    const FOOT_ZR = 0.36;     // отступ по Z как доля глубины корпуса
    const footGeo = new THREE.BoxGeometry(FOOT_W, FOOT_H, FOOT_D); // одна геометрия — четыре одинаковые ножки шарят её
    [[-W*FOOT_XR,-D*FOOT_ZR],[-W*FOOT_XR,D*FOOT_ZR],[W*FOOT_XR,-D*FOOT_ZR],[W*FOOT_XR,D*FOOT_ZR]].forEach(([x, z]) => {
      const foot = new THREE.Mesh(footGeo, mRubber);
      foot.position.set(x, -H/2 - FOOT_H/2, z);
      g.add(foot);
    });

    // ── ВНУТРЕННЯЯ ПОДСВЕТКА ──
    // PointLight — точечный источник света, светит во все стороны как лампочка.
    // Аргументы: цвет, интенсивность, радиус (distance — за этой границей свет = 0; больший радиус = плавнее градиент = мягче).
    const gl = new THREE.PointLight(0x8b5cf6, 3.5, 6.0);  // основной — насыщенный фиолетовый, дотягивается до углов
    gl.position.set(0, GLASS_CY, 0); // в центре стеклянной зоны
    g.add(gl);

    const gl2 = new THREE.PointLight(0x6d28d9, 2.5, 4.5); // нижняя подсветка — глубокий тон у основания
    gl2.position.set(0, GLASS_BOTTOM + 0.3, 0);
    g.add(gl2);


    return g; // возвращаем собранный корпус
  }

  // Делаем функцию доступной глобально, чтобы index.html мог её вызывать
  window.buildCase = buildCase;
})();
