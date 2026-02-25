import time
import serial

# CHANGE THIS to your Bluetooth COM port from Device Manager (e.g., "COM7")
PORT = "COM7"
BAUD = 115200  # pyserial still needs a baud value; Bluetooth SPP ignores actual UART baud
TIMEOUT = 1

def main():
    with serial.Serial(PORT, BAUD, timeout=TIMEOUT) as ser:
        time.sleep(1.0)  # let link settle
        print("Connected to", PORT)

        # Send a few messages
        for i in range(5):
            msg = f"hello {i}\n"
            ser.write(msg.encode("utf-8"))
            print("TX:", msg.strip())

            # Read any responses that come in shortly after
            t_end = time.time() + 1.0
            while time.time() < t_end:
                line = ser.readline()
                if line:
                    print("RX:", line.decode(errors="replace").strip())

            time.sleep(1)

        # Interactive mode
        print("\nType and press Enter to send. Ctrl+C to quit.")
        while True:
            user = input("> ")
            ser.write((user + "\n").encode("utf-8"))

            # Read back one line (if your ESP32 replies)
            line = ser.readline()
            if line:
                print("RX:", line.decode(errors="replace").strip())

if __name__ == "__main__":
    main()
