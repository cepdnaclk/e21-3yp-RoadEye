import socket
import time
from PIL import Image
import struct
from pathlib import Path
import sys

ESP32_IP = "192.168.137.131"
PORT = 5005

FRAME_W = 128
FRAME_H = 160
CHUNK_SIZE = 1024

# Locate image file. Check the script directory first, then current working directory.
script_dir = Path(__file__).resolve().parent
candidate_paths = [script_dir / "test.jpg", Path.cwd() / "test.jpg"]
img_path = None
for p in candidate_paths:
    if p.exists():
        img_path = p
        break


# Load and resize image
img = Image.open(img_path).resize((FRAME_W, FRAME_H))
img = img.convert("RGB")

# Convert to RGB565
frame_data = bytearray()

for y in range(FRAME_H):
    for x in range(FRAME_W):
        r, g, b = img.getpixel((x, y))
        rgb565 = ((r & 0xF8) << 8) | ((g & 0xFC) << 3) | (b >> 3)
        frame_data += struct.pack("<H", rgb565)

sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)

print("Sending image...")

for i in range(0, len(frame_data), CHUNK_SIZE):
    chunk = frame_data[i:i+CHUNK_SIZE]
    sock.sendto(chunk, (ESP32_IP, PORT))
    time.sleep(0.001)

print("Done.")