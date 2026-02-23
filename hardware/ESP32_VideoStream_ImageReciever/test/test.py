import socket
import time
from PIL import Image
import struct
from pathlib import Path

ESP32_IP = "192.168.137.131"
PORT = 5005

FRAME_W = 128
FRAME_H = 160
CHUNK_SIZE = 1024

# Locate image file
script_dir = Path(__file__).resolve().parent
candidate_paths = [script_dir / "test.jpg", Path.cwd() / "test.jpg"]

img_path = None
for p in candidate_paths:
    if p.exists():
        img_path = p
        break

if img_path is None:
    raise FileNotFoundError("test.jpg not found.")

# -----------------------------
# Load image (keep aspect ratio)
# -----------------------------
img = Image.open(img_path).convert("RGB")

orig_w, orig_h = img.size
orig_ratio = orig_w / orig_h
target_ratio = FRAME_W / FRAME_H

# Resize while preserving aspect ratio (fill mode)
if orig_ratio > target_ratio:
    # Image is wider → match height
    new_h = FRAME_H
    new_w = int(new_h * orig_ratio)
else:
    # Image is taller → match width
    new_w = FRAME_W
    new_h = int(new_w / orig_ratio)

img = img.resize((new_w, new_h), Image.LANCZOS)

# Center crop to exact frame size
left = (new_w - FRAME_W) // 2
top = (new_h - FRAME_H) // 2
right = left + FRAME_W
bottom = top + FRAME_H

img = img.crop((left, top, right, bottom))

# -----------------------------
# Convert to RGB565
# -----------------------------
frame_data = bytearray()

for y in range(FRAME_H):
    for x in range(FRAME_W):
        r, g, b = img.getpixel((x, y))

        r5 = r >> 3
        g6 = g >> 2
        b5 = b >> 3

        rgb565 = (r5 << 11) | (g6 << 5) | b5
        frame_data += struct.pack("<H", rgb565)

# -----------------------------
# Send via UDP
# -----------------------------
sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)

print("Sending image...")

for i in range(0, len(frame_data), CHUNK_SIZE):
    chunk = frame_data[i:i + CHUNK_SIZE]
    sock.sendto(chunk, (ESP32_IP, PORT))
    time.sleep(0.001)  # small delay for stability

print("Done.")