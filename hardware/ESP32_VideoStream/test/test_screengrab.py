"""
Stream a live screen-grab (cropped region) to ESP32 over TCP as JPEG frames.

Protocol (matches your ESP32):
- Send 4-byte little-endian uint32 size
- Send JPEG bytes
- Wait for 1-byte ACK == 0x01

Dependencies:
  pip install opencv-python mss numpy

How to use:
1) Set ESP32_IP / PORT
2) Set REGION = (left, top, width, height) for your 1920x1080 screen
3) Run: python stream_screen.py
"""

import time
import socket
import struct

import cv2
import numpy as np
import mss

ESP32_IP = "192.168.137.42"
PORT = 5005

# ---- Select the region of your 1920x1080 display to stream ----
# Format: (left, top, width, height)
# Example: top-left 640x480 area
REGION = (1920-128*2-50, 0, 128*2, 160*2)

# TFT target
TFT_W, TFT_H = 128, 160
TARGET_AR = TFT_W / TFT_H

JPEG_QUALITY = 55          # try 55..80
TARGET_FPS = 12            # cap streaming FPS (set None for "as fast as possible")


def center_crop_to_aspect(img_bgr: np.ndarray, target_ar: float) -> np.ndarray:
    h, w = img_bgr.shape[:2]
    src_ar = w / h

    if src_ar > target_ar:
        # Wider than target -> crop width
        new_w = int(h * target_ar)
        x0 = (w - new_w) // 2
        return img_bgr[:, x0:x0 + new_w]
    else:
        # Taller than target -> crop height
        new_h = int(w / target_ar)
        y0 = (h - new_h) // 2
        return img_bgr[y0:y0 + new_h, :]


def main():
    print("Connecting to ESP32 TCP server...")
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)
    sock.connect((ESP32_IP, PORT))
    print("Connected!")

    left, top, width, height = REGION
    monitor = {"left": left, "top": top, "width": width, "height": height}

    frame_count = 0
    next_frame_time = time.perf_counter()

    with mss.mss() as sct:
        while True:
            # FPS cap (optional)
            if TARGET_FPS:
                now = time.perf_counter()
                if now < next_frame_time:
                    time.sleep(next_frame_time - now)
                next_frame_time = max(next_frame_time + 1.0 / TARGET_FPS, time.perf_counter())

            # Grab screen region (BGRA)
            shot = sct.grab(monitor)
            frame = np.array(shot)  # BGRA
            frame = cv2.cvtColor(frame, cv2.COLOR_BGRA2BGR)

            # Crop to TFT aspect ratio (no stretching) then resize
            frame = center_crop_to_aspect(frame, TARGET_AR)
            frame = cv2.resize(frame, (TFT_W, TFT_H), interpolation=cv2.INTER_AREA)

            # Encode JPEG
            ok, jpg = cv2.imencode(".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), JPEG_QUALITY])
            if not ok:
                continue

            data = jpg.tobytes()
            size = len(data)

            try:
                # Send size + payload
                sock.sendall(struct.pack("<I", size))
                sock.sendall(data)

                # Wait for 1-byte ACK
                ack = sock.recv(1)
                if ack != b"\x01":
                    print("ACK error (got:", ack, "). Stopping.")
                    break

            except (BrokenPipeError, ConnectionResetError, OSError) as e:
                print("Connection lost:", e)
                break

            frame_count += 1
            if frame_count % 30 == 0:
                print(f"Streaming... frames sent: {frame_count} (last size {size} bytes)")

    sock.close()
    print("Stopped.")


if __name__ == "__main__":
    main()