/**
 * Аватар ребёнка — конструктор «собери себя» на DiceBear (стиль Avataaars).
 *
 * Картинка генерируется по URL прямо с api.dicebear.com — ничего скачивать
 * и класть в проект не нужно. Параметры берутся из официальной схемы стиля
 * (9.x/avataaars). Чтобы зафиксировать конкретный вариант, передаём одно
 * значение опции (а не список) — тогда DiceBear не выбирает случайно.
 *
 * База бесплатна; премиум-элементы открываются за звёзды (cost > 0).
 */

export const DICEBEAR = "https://api.dicebear.com/9.x/avataaars/svg";

export type AvatarFeature =
  | "skinColor" | "top" | "hairColor" | "clothing" | "clothesColor"
  | "eyes" | "mouth" | "accessory" | "bg";

export interface AvatarConfig {
  skinColor: string;
  top: string;
  hairColor: string;
  clothing: string;
  clothesColor: string;
  eyes: string;
  mouth: string;
  accessory: string; // "none" или код аксессуара
  bg: string;
}

export const DEFAULT_AVATAR: AvatarConfig = {
  skinColor: "edb98a",
  top: "shortFlat",
  hairColor: "2c1b18",
  clothing: "hoodie",
  clothesColor: "3c4f5c",
  eyes: "happy",
  mouth: "smile",
  accessory: "none",
  bg: "b6e3f4",
};

export interface Opt {
  value: string;
  label: string;
  /** цена в звёздах; 0/undefined — бесплатно */
  cost?: number;
}

/** Цвет-опции (бесплатные) — показываем как образцы цвета. */
export const SKIN: string[] = ["ffdbb4", "edb98a", "fd9841", "d08b5b", "ae5d29", "614335", "f8d25c"];
export const HAIR_COLOR: string[] = ["2c1b18", "4a312c", "724133", "a55728", "b58143", "d6b370", "c93305", "e8e1e1", "ecdcbf", "f59797"];
export const CLOTHES_COLOR: string[] = ["3c4f5c", "262e33", "5199e4", "65c9ff", "25557c", "a7ffc4", "ff488e", "ff5c5c", "ffafb9", "ffffb1", "e6e6e6", "ffffff"];
export const BG: string[] = ["b6e3f4", "c0aede", "d1d4f9", "ffd5dc", "ffdfbf", "transparent"];

/** Причёски и головные уборы. База бесплатно, особое — за звёзды. */
export const HAIR: Opt[] = [
  { value: "shortFlat", label: "Короткие" },
  { value: "shortRound", label: "Ёжик" },
  { value: "shortCurly", label: "Кудряшки" },
  { value: "bob", label: "Каре" },
  { value: "straight01", label: "Прямые" },
  { value: "curly", label: "Кудри" },
  { value: "longButNotTooLong", label: "Длинные", cost: 40 },
  { value: "straightAndStrand", label: "С прядью", cost: 40 },
  { value: "bigHair", label: "Пышные", cost: 40 },
  { value: "curvy", label: "Волнистые", cost: 40 },
  { value: "fro", label: "Афро", cost: 60 },
  { value: "dreads01", label: "Дреды", cost: 60 },
  { value: "frida", label: "Коса", cost: 60 },
  { value: "miaWallace", label: "Чёлка", cost: 60 },
  { value: "hat", label: "Шапка", cost: 80 },
  { value: "winterHat02", label: "Зимняя шапка", cost: 80 },
  { value: "turban", label: "Тюрбан", cost: 80 },
  { value: "hijab", label: "Хиджаб", cost: 80 },
];

export const CLOTHING: Opt[] = [
  { value: "hoodie", label: "Худи" },
  { value: "shirtCrewNeck", label: "Футболка" },
  { value: "shirtVNeck", label: "Футболка V" },
  { value: "shirtScoopNeck", label: "Топ" },
  { value: "collarAndSweater", label: "Свитер" },
  { value: "graphicShirt", label: "С принтом", cost: 30 },
  { value: "overall", label: "Комбинезон", cost: 30 },
  { value: "blazerAndShirt", label: "Пиджак", cost: 50 },
  { value: "blazerAndSweater", label: "Пиджак+свитер", cost: 50 },
];

export const EYES: Opt[] = [
  { value: "happy", label: "Счастливые" },
  { value: "default", label: "Обычные" },
  { value: "wink", label: "Подмигивание" },
  { value: "hearts", label: "Сердечки" },
  { value: "squint", label: "Прищур" },
  { value: "surprised", label: "Удивление" },
];

export const MOUTH: Opt[] = [
  { value: "smile", label: "Улыбка" },
  { value: "default", label: "Спокойный" },
  { value: "twinkle", label: "Хитрюга" },
  { value: "tongue", label: "Язык" },
  { value: "serious", label: "Серьёзный" },
];

export const ACCESSORY: Opt[] = [
  { value: "none", label: "Без очков" },
  { value: "round", label: "Круглые", cost: 30 },
  { value: "prescription02", label: "Очки", cost: 30 },
  { value: "sunglasses", label: "Солнечные", cost: 50 },
  { value: "wayfarers", label: "Стиляги", cost: 50 },
];

/** Пресеты пола задают только дефолтную причёску (бесплатную) — остальное свободно. */
export const GENDER_PRESET: Record<"boy" | "girl", Partial<AvatarConfig>> = {
  boy: { top: "shortFlat" },
  girl: { top: "bob" },
};

/** Собрать URL аватара DiceBear из конфигурации. */
export function buildAvatarUrl(c: AvatarConfig, size = 200): string {
  const p = new URLSearchParams();
  p.set("seed", "mysh");
  p.set("size", String(size));
  p.set("radius", "50");
  p.set("skinColor", c.skinColor);
  p.set("top", c.top);
  p.set("topProbability", "100");
  p.set("hairColor", c.hairColor);
  p.set("hatColor", c.clothesColor);
  p.set("clothing", c.clothing);
  p.set("clothesColor", c.clothesColor);
  p.set("eyes", c.eyes);
  p.set("mouth", c.mouth);
  p.set("facialHairProbability", "0");
  if (c.accessory && c.accessory !== "none") {
    p.set("accessories", c.accessory);
    p.set("accessoriesProbability", "100");
  } else {
    p.set("accessoriesProbability", "0");
  }
  p.set("backgroundColor", c.bg);
  return `${DICEBEAR}?${p.toString()}`;
}
