import cv2
import socket
import struct

ESP32_IP = "192.168.137.91"  # ESP32 IP
PORT = 5005

print("Connecting to ESP32 TCP server...")
sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
sock.connect((ESP32_IP, PORT))
print("Connected!")

cap = cv2.VideoCapture("video.mp4")
frame_count = 0

while True:
    ret, frame = cap.read()
    if not ret:
        break

    frame_count += 1
    frame = cv2.resize(frame, (128, 160))
    success, jpg = cv2.imencode('.jpg', frame, [int(cv2.IMWRITE_JPEG_QUALITY), 55])
    if not success:
        continue

    data = jpg.tobytes()
    size = len(data)

    try:
        # Send 4-byte frame size
        sock.sendall(struct.pack("<I", size))
        # Send JPEG data
        sock.sendall(data)

        # Wait for acknowledgment from ESP32
        ack = b''
        while len(ack) < 1:
            more = sock.recv(1 - len(ack))
            if not more:
                print("Connection closed by ESP32")
                break
            ack += more

        if ack != b'\x01':
            print("ACK not received correctly, stopping.")
            break

    except BrokenPipeError:
        print("Connection lost. Exiting.")
        break

    print(f"Frame {frame_count} sent ({size} bytes)")

sock.close()
cap.release()
print("Streaming finished.")