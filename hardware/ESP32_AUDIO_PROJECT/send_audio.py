import socket
import subprocess

ESP_IP = "192.168.137.253"
PORT = 4210

AUDIO_FILE = r"C:\Users\User\Desktop\file_example_MP3_2MG.mp3"

sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)

# 🔥 Convert MP3 → RAW PCM using ffmpeg (NO PYDUB)
ffmpeg_cmd = [
    "ffmpeg",
    "-i", AUDIO_FILE,
    "-f", "s16le",        # 16-bit PCM
    "-acodec", "pcm_s16le",
    "-ac", "1",           # MONO
    "-ar", "44100",       # sample rate
    "-"
]

print("Starting audio stream...")

process = subprocess.Popen(ffmpeg_cmd, stdout=subprocess.PIPE)

chunk_size = 512

while True:
    data = process.stdout.read(chunk_size)
    if not data:
        break
    sock.sendto(data, (ESP_IP, PORT))

print("Done")