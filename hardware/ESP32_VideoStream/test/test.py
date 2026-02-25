import cv2
import socket
import struct

ESP32_IP = "192.168.137.50"
PORT = 5005

TFT_W, TFT_H = 128, 160
TARGET_AR = TFT_W / TFT_H

JPEG_QUALITY = 60  # Adjust as needed

def center_crop_to_aspect(frame, target_ar):
    h, w = frame.shape[:2]
    src_ar = w / h

    if src_ar > target_ar:
        # Wider than target → crop width
        new_w = int(h * target_ar)
        x0 = (w - new_w) // 2
        return frame[:, x0:x0 + new_w]
    else:
        # Taller than target → crop height
        new_h = int(w / target_ar)
        y0 = (h - new_h) // 2
        return frame[y0:y0 + new_h, :]

print("Connecting to ESP32 TCP server...")
sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
sock.connect((ESP32_IP, PORT))
print("Connected!")

cap = cv2.VideoCapture("video1.mp4")
frame_count = 0

while True:
    ret, frame = cap.read()

    # ✅ If video ends, rewind to start
    if not ret:
        print("Restarting video...")
        cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
        continue

    frame_count += 1

    # Crop to TFT aspect ratio
    frame = center_crop_to_aspect(frame, TARGET_AR)

    # Resize to TFT resolution
    frame = cv2.resize(frame, (TFT_W, TFT_H), interpolation=cv2.INTER_AREA)

    success, jpg = cv2.imencode(
        ".jpg",
        frame,
        [int(cv2.IMWRITE_JPEG_QUALITY), JPEG_QUALITY]
    )
    if not success:
        continue

    data = jpg.tobytes()
    size = len(data)

    try:
        # Send frame size
        sock.sendall(struct.pack("<I", size))
        # Send JPEG data
        sock.sendall(data)

        # Wait for ACK
        ack = sock.recv(1)
        if ack != b"\x01":
            print("ACK error, stopping.")
            break

    except (BrokenPipeError, ConnectionResetError):
        print("Connection lost.")
        break

    print(f"Frame {frame_count} sent ({size} bytes)")

sock.close()
cap.release()
print("Streaming stopped.")