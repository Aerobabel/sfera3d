# -*- coding: utf-8 -*-
from pathlib import Path
from typing import Dict, List, Tuple

from fpdf import FPDF

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "public" / "onboarding"
OUT_DIR.mkdir(parents=True, exist_ok=True)

INTAKE_EMAIL = "suppliers@3dsfera.org"

FONT_PATHS = {
    "en": Path(r"C:\Windows\Fonts\arial.ttf"),
    "ru": Path(r"C:\Windows\Fonts\arial.ttf"),
    "zh": Path(r"C:\Windows\Fonts\simsunb.ttf"),
}

OUTPUT_FILES = {
    "en": "english_onboarding.pdf",
    "ru": "russian_onboarding.pdf",
    "zh": "chinese_onboarding.pdf",
}


def rgb(hex_color: str) -> Tuple[int, int, int]:
    value = hex_color.lstrip("#")
    return tuple(int(value[i : i + 2], 16) for i in (0, 2, 4))


COLORS = {
    "bg": rgb("#090b10"),
    "panel": rgb("#0f1218"),
    "card": rgb("#111723"),
    "border": rgb("#2a3342"),
    "teal": rgb("#66d9cb"),
    "amber": rgb("#f6ba4f"),
    "text": rgb("#f5f1e9"),
    "muted": rgb("#cbc5bb"),
}


LANG_DATA: Dict[str, Dict[str, object]] = {
    "en": {
        "tag": "SIMPLE SUPPLIER GUIDE",
        "title": "Send us these basics and we can build your 3D pavillon.",
        "description": "No technical setup needed from your side. Just send clear photos and simple product information.",
        "rules_title": "WHAT TO SEND US",
        "rules_subtitle": "Think of this like a school checklist.",
        "rules": [
            ("Photos from all sides", "Front, back, left, right, top, bottom, plus one close photo."),
            ("Good lighting", "Use daylight or soft white light. Avoid dark shadows."),
            ("Clean background", "Use a plain background so the product stands out."),
            ("Short product description", "2 to 4 simple sentences: what it is and who it is for."),
            ("Price and quantity", "Unit price, minimum order quantity, and current stock."),
            ("Warranty / guarantee", "How long the warranty lasts and what it covers."),
            ("Size and weight", "Length, width, height, and weight."),
            ("Colors and versions", "Tell us colors, sizes, and model names."),
            ("Contact details", "Name, email or phone, and how fast you can reply."),
        ],
        "send_title": "HOW TO SEND IT",
        "send_steps": [
            "1. Make one folder per product.",
            "2. Put all photos in a photos folder.",
            "3. Add one info.txt file with description, price, quantity, and warranty.",
            "4. Zip the folder and upload it in the supplier intake portal.",
        ],
        "sample_title": "EASY FOLDER EXAMPLE",
        "sample_lines": [
            "monitor-001/",
            "  photos/",
            "    front.jpg",
            "    back.jpg",
            "    left.jpg",
            "    right.jpg",
            "    top.jpg",
            "    bottom.jpg",
            "    detail.jpg",
            "  info.txt",
        ],
        "check_title": "FINAL QUICK CHECK",
        "checks": [
            "I added all side photos.",
            "My photos are bright and clear.",
            "I added description, price, and quantity.",
            "I added warranty details.",
            "I added size and weight.",
            "I added my contact details.",
        ],
        "check_footer": "If these are ready, we can build your 3D booth quickly.",
    },
    "ru": {
        "tag": "ПРОСТОЙ ГИД ДЛЯ ПОСТАВЩИКА",
        "title": "Пришлите эти базовые данные, и мы соберем ваш 3D павильон.",
        "description": "От вас не нужна сложная техническая настройка. Нужны только понятные фото и простая информация о товаре.",
        "rules_title": "ЧТО НУЖНО ОТПРАВИТЬ",
        "rules_subtitle": "Представьте, что это школьный чеклист.",
        "rules": [
            ("Фото со всех сторон", "Front, back, left, right, top, bottom и одно фото крупным планом."),
            ("Хороший свет", "Дневной свет или мягкий белый свет. Без темных теней."),
            ("Чистый фон", "Простой фон, чтобы товар хорошо выделялся."),
            ("Короткое описание", "2-4 простых предложения: что это за товар и для кого он."),
            ("Цена и количество", "Цена за единицу, минимальный заказ и остаток на складе."),
            ("Гарантия", "Срок гарантии и что в нее входит."),
            ("Размер и вес", "Длина, ширина, высота и вес."),
            ("Цвета и версии", "Какие есть цвета, размеры и названия моделей."),
            ("Контакты", "Имя, email или телефон и скорость ответа."),
        ],
        "send_title": "КАК ОТПРАВИТЬ",
        "send_steps": [
            "1. Сделайте отдельную папку на каждый товар.",
            "2. Положите все фото в папку photos.",
            "3. Добавьте один файл info.txt с описанием, ценой, количеством и гарантией.",
            "4. Соберите ZIP и загрузите его через портал поставщика.",
        ],
        "sample_title": "ПРОСТОЙ ПРИМЕР ПАПКИ",
        "sample_lines": [
            "monitor-001/",
            "  photos/",
            "    front.jpg",
            "    back.jpg",
            "    left.jpg",
            "    right.jpg",
            "    top.jpg",
            "    bottom.jpg",
            "    detail.jpg",
            "  info.txt",
        ],
        "check_title": "ФИНАЛЬНАЯ БЫСТРАЯ ПРОВЕРКА",
        "checks": [
            "Я добавил фото со всех сторон.",
            "Фото светлые и четкие.",
            "Я добавил описание, цену и количество.",
            "Я добавил данные по гарантии.",
            "Я добавил размер и вес.",
            "Я добавил контактные данные.",
        ],
        "check_footer": "Если это готово, мы быстро соберем ваш 3D стенд.",
    },
    "zh": {
        "tag": "供应商简易指南",
        "title": "把这些基础资料发给我们，我们就能搭建你的 3D 展馆。",
        "description": "你不需要做复杂技术配置。只要提供清晰照片和简单商品信息即可。",
        "rules_title": "你需要提供",
        "rules_subtitle": "可以把它当成一份学校作业清单。",
        "rules": [
            ("各角度照片", "front、back、left、right、top、bottom，再加 1 张细节图。"),
            ("光线充足", "使用日光或柔和白光，避免阴影太重。"),
            ("背景干净", "使用纯净背景，让商品更突出。"),
            ("简短商品描述", "2 到 4 句简单文字：它是什么、适合谁。"),
            ("价格和数量", "单价、最小起订量、当前库存。"),
            ("质保信息", "质保时长，以及质保范围。"),
            ("尺寸和重量", "长、宽、高和重量。"),
            ("颜色和版本", "告诉我们可选颜色、尺寸和型号名称。"),
            ("联系方式", "姓名、邮箱或电话，以及回复速度。"),
        ],
        "send_title": "如何发送",
        "send_steps": [
            "1. 每个商品建一个独立文件夹。",
            "2. 把所有照片放进 photos 文件夹。",
            "3. 新增一个 info.txt，写上描述、价格、数量和质保。",
            "4. 将文件夹压缩为 ZIP 并在供应商入口上传。",
        ],
        "sample_title": "简单目录示例",
        "sample_lines": [
            "monitor-001/",
            "  photos/",
            "    front.jpg",
            "    back.jpg",
            "    left.jpg",
            "    right.jpg",
            "    top.jpg",
            "    bottom.jpg",
            "    detail.jpg",
            "  info.txt",
        ],
        "check_title": "最后快速检查",
        "checks": [
            "我已上传所有角度照片。",
            "照片清晰、亮度正常。",
            "我已填写描述、价格和数量。",
            "我已填写质保信息。",
            "我已填写尺寸和重量。",
            "我已填写联系方式。",
        ],
        "check_footer": "这些准备好后，我们就能快速开始搭建你的 3D 展位。",
    },
}


def set_font(pdf: FPDF, family: str, size: int, bold: bool = False) -> None:
    pdf.set_font(family, "B" if bold else "", size)


def draw_rect(pdf: FPDF, x: float, y: float, w: float, h: float, color_key: str) -> None:
    pdf.set_fill_color(*COLORS[color_key])
    pdf.set_draw_color(*COLORS["border"])
    pdf.rect(x, y, w, h, "DF")


def write_text(
    pdf: FPDF,
    family: str,
    size: int,
    color_key: str,
    x: float,
    y: float,
    width: float,
    line_height: float,
    value: str,
    bold: bool = False,
) -> float:
    set_font(pdf, family, size, bold=bold)
    pdf.set_text_color(*COLORS[color_key])
    pdf.set_xy(x, y)
    pdf.multi_cell(width, line_height, value)
    return pdf.get_y()


def draw_page_background(pdf: FPDF) -> None:
    pdf.set_fill_color(*COLORS["bg"])
    pdf.rect(0, 0, 210, 297, "F")


def build_pdf_for_lang(lang: str) -> Path:
    data = LANG_DATA[lang]
    font_file = FONT_PATHS[lang]
    if not font_file.exists():
        raise FileNotFoundError(f"Font not found: {font_file}")

    family = f"onboarding_{lang}"
    pdf = FPDF(unit="mm", format="A4")
    pdf.set_auto_page_break(False)
    pdf.add_font(family, "", str(font_file), uni=True)
    pdf.add_font(family, "B", str(font_file), uni=True)

    margin = 12.0
    content_w = 210 - (margin * 2)

    title_size = 20 if lang != "zh" else 18
    body_size = 10 if lang != "zh" else 9
    card_title_size = 10 if lang != "zh" else 9
    card_body_size = 8 if lang != "zh" else 7

    rules = data["rules"]
    send_steps = data["send_steps"]
    sample_lines = data["sample_lines"]
    checks = data["checks"]

    # Page 1
    pdf.add_page()
    draw_page_background(pdf)

    draw_rect(pdf, margin, 10, content_w, 58, "panel")
    y = 16
    y = write_text(pdf, family, 9, "teal", margin + 6, y, content_w - 12, 4.2, str(data["tag"]), bold=True) + 1
    y = write_text(pdf, family, title_size, "text", margin + 6, y, content_w - 12, 8.0, str(data["title"]), bold=True) + 1
    write_text(pdf, family, body_size, "muted", margin + 6, y, content_w - 12, 5.0, str(data["description"]))

    draw_rect(pdf, margin, 74, content_w, 211, "panel")
    y = write_text(pdf, family, 11, "teal", margin + 6, 80, content_w - 12, 5.0, str(data["rules_title"]), bold=True)
    write_text(pdf, family, 9, "muted", margin + 6, y + 1, content_w - 12, 4.5, str(data["rules_subtitle"]))

    gap = 3.0
    grid_x = margin + 4
    grid_y = 96
    card_w = (content_w - 8 - gap * 2) / 3
    card_h = 58

    for idx, (title, description) in enumerate(rules):
        row = idx // 3
        col = idx % 3
        x = grid_x + col * (card_w + gap)
        y = grid_y + row * (card_h + gap)
        draw_rect(pdf, x, y, card_w, card_h, "card")
        card_y = write_text(
            pdf,
            family,
            card_title_size,
            "text",
            x + 3,
            y + 4,
            card_w - 6,
            4.3,
            str(title),
            bold=True,
        )
        write_text(
            pdf,
            family,
            card_body_size,
            "muted",
            x + 3,
            card_y + 1,
            card_w - 6,
            3.9,
            str(description),
        )

    # Page 2
    pdf.add_page()
    draw_page_background(pdf)

    left_w = 112.0
    right_w = content_w - left_w - 4
    top_h = 122.0

    draw_rect(pdf, margin, 12, left_w, top_h, "panel")
    draw_rect(pdf, margin + left_w + 4, 12, right_w, top_h, "panel")

    y = write_text(pdf, family, 11, "teal", margin + 6, 18, left_w - 12, 5.0, str(data["send_title"]), bold=True)
    for step in send_steps:
        y = write_text(pdf, family, body_size, "text", margin + 6, y + 2, left_w - 12, 4.8, str(step))

    write_text(
        pdf,
        family,
        8,
        "amber",
        margin + 6,
        112,
        left_w - 12,
        4.2,
        f"Intake: {INTAKE_EMAIL}",
        bold=True,
    )

    y = write_text(
        pdf,
        family,
        11,
        "amber",
        margin + left_w + 10,
        18,
        right_w - 12,
        5.0,
        str(data["sample_title"]),
        bold=True,
    )
    write_text(
        pdf,
        family,
        8 if lang != "zh" else 7,
        "text",
        margin + left_w + 10,
        y + 3,
        right_w - 16,
        4.6,
        "\n".join(str(item) for item in sample_lines),
    )

    check_y = 140
    check_h = 145
    draw_rect(pdf, margin, check_y, content_w, check_h, "panel")

    write_text(
        pdf,
        family,
        11,
        "teal",
        margin + 6,
        check_y + 6,
        content_w - 12,
        5.0,
        str(data["check_title"]),
        bold=True,
    )

    item_w = (content_w - 12 - 4) / 2
    item_h = 20
    start_x = margin + 6
    start_y = check_y + 16

    for idx, item in enumerate(checks):
        row = idx // 2
        col = idx % 2
        x = start_x + col * (item_w + 4)
        y = start_y + row * (item_h + 4)
        draw_rect(pdf, x, y, item_w, item_h, "card")
        write_text(
            pdf,
            family,
            8 if lang != "zh" else 7,
            "text",
            x + 3,
            y + 3.3,
            item_w - 6,
            4.0,
            str(item),
        )

    write_text(
        pdf,
        family,
        9 if lang != "zh" else 8,
        "muted",
        margin + 6,
        check_y + check_h - 15,
        content_w - 12,
        4.6,
        str(data["check_footer"]),
    )

    filename = OUTPUT_FILES[lang]
    target = OUT_DIR / filename
    temp = OUT_DIR / f"{filename}.tmp"
    pdf.output(str(temp))
    if target.exists():
        target.unlink()
    temp.replace(target)
    return target


def main() -> None:
    for lang in ("en", "ru", "zh"):
        out = build_pdf_for_lang(lang)
        print(f"{out.name}: {out.stat().st_size} bytes")


if __name__ == "__main__":
    main()
