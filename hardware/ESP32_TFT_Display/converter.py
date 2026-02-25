from pathlib import Path
from PIL import Image
import re

# ===== SETTINGS =====
TARGET_WIDTH  = 128
TARGET_HEIGHT = 160
FIT_MODE = "exact"   # "exact", "crop", "contain"

INPUT_DIR  = Path("Input_Images")
OUTPUT_DIR = Path("Converted_Images")

# ====================


def sanitize_name(name: str) -> str:
    """Make a valid C variable name from filename."""
    name = name.lower()
    name = re.sub(r'\W+', '_', name)
    if name[0].isdigit():
        name = "_" + name
    return name


def rgb888_to_rgb565(r, g, b):
    return ((b & 0xF8) << 8) | ((g & 0xFC) << 3) | (r >> 3)


def resize_image(img, w, h, fit):
    if fit == "exact":
        return img.resize((w, h), Image.LANCZOS)

    if fit == "contain":
        img.thumbnail((w, h), Image.LANCZOS)
        canvas = Image.new("RGB", (w, h), (0, 0, 0))
        x = (w - img.width) // 2
        y = (h - img.height) // 2
        canvas.paste(img, (x, y))
        return canvas

    if fit == "crop":
        src_w, src_h = img.size
        scale = max(w / src_w, h / src_h)
        new_w = int(src_w * scale)
        new_h = int(src_h * scale)
        resized = img.resize((new_w, new_h), Image.LANCZOS)
        left = (new_w - w) // 2
        top  = (new_h - h) // 2
        return resized.crop((left, top, left + w, top + h))

    raise ValueError("Invalid FIT_MODE")


def write_header(path, var_name, w, h, data):
    with open(path, "w") as f:
        f.write("// Auto-generated RGB565 image header\n")
        f.write("#pragma once\n")
        f.write("#include <stdint.h>\n\n")
        f.write(f"#define {var_name}_width  {w}\n")
        f.write(f"#define {var_name}_height {h}\n\n")
        f.write(f"const uint16_t {var_name}[{w*h}] = {{\n")

        for i, val in enumerate(data):
            if i % 12 == 0:
                f.write("  ")
            f.write(f"0x{val:04X}")
            if i != len(data) - 1:
                f.write(", ")
            if (i + 1) % 12 == 0:
                f.write("\n")

        f.write("\n};\n")


def convert_image(img_path):
    print(f"🖼 Processing {img_path.name}")

    img = Image.open(img_path).convert("RGB")
    img = resize_image(img, TARGET_WIDTH, TARGET_HEIGHT, FIT_MODE)

    pixels = img.load()
    rgb565_data = []

    for y in range(TARGET_HEIGHT):
        for x in range(TARGET_WIDTH):
            r, g, b = pixels[x, y]
            rgb565_data.append(rgb888_to_rgb565(r, g, b))

    var_name = sanitize_name(img_path.stem)
    header_path = OUTPUT_DIR / f"{var_name}.h"

    write_header(header_path, var_name, TARGET_WIDTH, TARGET_HEIGHT, rgb565_data)

    print(f"✅ Saved → {header_path.name}")


def main():
    if not INPUT_DIR.exists():
        print("❌ Input_Images folder not found")
        return

    OUTPUT_DIR.mkdir(exist_ok=True)

    image_files = list(INPUT_DIR.glob("*.*"))

    if not image_files:
        print("❌ No images found in Input_Images")
        return

    for img in image_files:
        try:
            convert_image(img)
        except Exception as e:
            print(f"⚠ Skipped {img.name}: {e}")

    print("\n🎉 Conversion complete!")


if __name__ == "__main__":
    main()
