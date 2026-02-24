import { Product } from "./types";

export type AppLanguage = "ru" | "zh" | "en";

export const DEFAULT_LANGUAGE: AppLanguage = "ru";
export const LANGUAGE_STORAGE_KEY = "3dsfera_language";

export const isAppLanguage = (value: unknown): value is AppLanguage =>
  value === "ru" || value === "zh" || value === "en";

type LocalizedProductText = {
  name?: string;
  shortDescription?: string;
  fullDescription?: string;
};

const PRODUCT_LOCALIZATION: Record<AppLanguage, Record<string, LocalizedProductText>> = {
  en: {},
  ru: {
    prod_101: {
      name: "Techway Gaming G15",
      shortDescription: "Максимальная игровая производительность.",
      fullDescription:
        "Доминируйте в игре с Techway G15. RTX 4080, дисплей 240 Гц и механическая RGB-клавиатура.",
    },
    prod_102: {
      name: "Techway Ultrabook Air",
      shortDescription: "Тонкий. Легкий. Мощный.",
      fullDescription:
        "Ultrabook Air задает новый стандарт мобильности: автономность на весь день, 4K OLED-дисплей и корпус из аэрокосмического алюминия.",
    },
    prod_201: {
      name: "PlayStation 5 Pro",
      shortDescription: "Игра без ограничений.",
      fullDescription:
        "Молниеносная загрузка благодаря сверхбыстрому SSD, глубокое погружение с тактильной отдачей, адаптивными триггерами и 3D-звуком.",
    },
    monitor_001: {
      name: "Монитор 001",
      shortDescription: "Монитор.",
      fullDescription:
        "Монитор в павильоне Nonagon. Свяжитесь с поставщиком для подробных характеристик и совместимости.",
    },
    monitor_002: {
      name: "Монитор 002",
      shortDescription: "Монитор.",
      fullDescription:
        "Монитор в павильоне Nonagon. Свяжитесь с поставщиком для характеристик и наличия.",
    },
    phone_001: {
      name: "Смартфон 001",
      shortDescription: "Смартфон.",
      fullDescription:
        "Смартфон в павильоне Nonagon. Свяжитесь с поставщиком для полных характеристик.",
    },
    phone_002: {
      name: "Смартфон 002",
      shortDescription: "Смартфон.",
      fullDescription:
        "Смартфон в павильоне Nonagon. Свяжитесь с поставщиком для полных характеристик.",
    },
    tablet_001: {
      name: "Планшет 001",
      shortDescription: "Планшет.",
      fullDescription:
        "Планшет в павильоне Nonagon. Свяжитесь с поставщиком для полных характеристик.",
    },
    tablet_002: {
      name: "Планшет 002",
      shortDescription: "Планшет.",
      fullDescription:
        "Планшет в павильоне Nonagon. Свяжитесь с поставщиком для полных характеристик.",
    },
  },
  zh: {
    prod_101: {
      name: "Techway Gaming G15",
      shortDescription: "旗舰级游戏性能。",
      fullDescription:
        "使用 Techway G15 主宰战场。配备 RTX 4080、240Hz 屏幕和机械 RGB 键盘。",
    },
    prod_102: {
      name: "Techway Ultrabook Air",
      shortDescription: "轻薄。便携。强劲。",
      fullDescription:
        "Ultrabook Air 重新定义移动办公：全天续航、4K OLED 屏幕和航天级铝合金机身。",
    },
    prod_201: {
      name: "PlayStation 5 Pro",
      shortDescription: "突破想象的游戏体验。",
      fullDescription:
        "借助超高速 SSD 实现闪电加载，通过触觉反馈、自适应扳机和 3D 音频获得更强沉浸感。",
    },
    monitor_001: {
      name: "显示器 001",
      shortDescription: "显示器。",
      fullDescription:
        "位于 Nonagon 展馆的显示器。可与供应商沟通详细参数与兼容性。",
    },
    monitor_002: {
      name: "显示器 002",
      shortDescription: "显示器。",
      fullDescription:
        "位于 Nonagon 展馆的显示器。可与供应商沟通参数与库存情况。",
    },
    phone_001: {
      name: "手机 001",
      shortDescription: "手机。",
      fullDescription:
        "位于 Nonagon 展馆的手机。可与供应商沟通完整参数。",
    },
    phone_002: {
      name: "手机 002",
      shortDescription: "手机。",
      fullDescription:
        "位于 Nonagon 展馆的手机。可与供应商沟通完整参数。",
    },
    tablet_001: {
      name: "平板 001",
      shortDescription: "平板。",
      fullDescription:
        "位于 Nonagon 展馆的平板。可与供应商沟通完整参数。",
    },
    tablet_002: {
      name: "平板 002",
      shortDescription: "平板。",
      fullDescription:
        "位于 Nonagon 展馆的平板。可与供应商沟通完整参数。",
    },
  },
};

export const getLocalizedProduct = (
  product: Product,
  language: AppLanguage
): Product => {
  const localized = PRODUCT_LOCALIZATION[language]?.[product.id];
  if (!localized) return product;

  return {
    ...product,
    name: localized.name ?? product.name,
    shortDescription: localized.shortDescription ?? product.shortDescription,
    fullDescription: localized.fullDescription ?? product.fullDescription,
  };
};
