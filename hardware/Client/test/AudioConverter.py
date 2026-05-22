import os
import subprocess

INPUT_DIR = "Input_Audio"
OUTPUT_DIR = "Output_Audio"

# Audio format settings (must match your ESP32 I2S config)
SAMPLE_RATE = 44100
CHANNELS = 1

def ensure_directories():
    if not os.path.exists(INPUT_DIR):
        os.makedirs(INPUT_DIR)
    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)

def convert_mp3_to_raw(mp3_path, raw_path):
    cmd = [
        "ffmpeg",
        "-i", mp3_path,
        "-ar", str(SAMPLE_RATE),
        "-ac", str(CHANNELS),
        "-f", "s16le",
        "-y",  # overwrite
        raw_path
    ]
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

def raw_to_c_array(raw_path, header_path, var_name):
    with open(raw_path, "rb") as f:
        data = f.read()

    with open(header_path, "w") as h:
        h.write("#ifndef {}_H\n".format(var_name.upper()))
        h.write("#define {}_H\n\n".format(var_name.upper()))

        h.write("const unsigned char {}[] = {{\n".format(var_name))

        for i, byte in enumerate(data):
            if i % 12 == 0:
                h.write("    ")
            h.write("0x{:02X}, ".format(byte))
            if i % 12 == 11:
                h.write("\n")

        h.write("\n};\n")
        h.write("const unsigned int {}_len = {};\n\n".format(var_name, len(data)))
        h.write("#endif\n")

def process_files():
    for file in os.listdir(INPUT_DIR):
        if file.lower().endswith(".mp3"):
            mp3_path = os.path.join(INPUT_DIR, file)

            base_name = os.path.splitext(file)[0]
            safe_name = base_name.replace(" ", "_").lower()

            raw_path = os.path.join(OUTPUT_DIR, safe_name + ".raw")
            header_path = os.path.join(OUTPUT_DIR, safe_name + ".h")

            print(f"Processing: {file}")

            # Step 1: MP3 -> RAW
            convert_mp3_to_raw(mp3_path, raw_path)

            # Step 2: RAW -> C array
            raw_to_c_array(raw_path, header_path, safe_name)

            # Optional: remove raw file (cleanup)
            os.remove(raw_path)

            print(f"Generated: {header_path}")

def main():
    ensure_directories()
    process_files()
    print("Done!")

if __name__ == "__main__":
    main()