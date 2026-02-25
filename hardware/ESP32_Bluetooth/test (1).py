import time
import serial
from serial import SerialException

PORT = "COM9"
BAUD = 115200
TIMEOUT = 1
RETRY_DELAY = 2  # seconds between reconnect attempts


def wait_for_connection():
    """Keep trying to open the Bluetooth serial port."""
    while True:
        try:
            ser = serial.Serial(PORT, BAUD, timeout=TIMEOUT)
            time.sleep(1.0)  # let Bluetooth link settle
            print(f"✅ Connected to {PORT}")
            return ser
        except SerialException:
            print(f"⏳ Waiting for ESP32 on {PORT}...")
            time.sleep(RETRY_DELAY)


def main():
    ser = wait_for_connection()

    try:
        # Initial messages
        for i in range(5):
            msg = f"hello {i}\n"
            ser.write(msg.encode("utf-8"))
            print("TX:", msg.strip())

            t_end = time.time() + 1.0
            while time.time() < t_end:
                try:
                    line = ser.readline()
                    if line:
                        print("RX:", line.decode(errors="replace").strip())
                except SerialException:
                    raise  # force reconnect

            time.sleep(1)

        # Interactive mode
        print("\nType and press Enter to send. Ctrl+C to quit.")
        while True:
            user = input("> ")
            try:
                ser.write((user + "\n").encode("utf-8"))

                line = ser.readline()
                if line:
                    print("RX:", line.decode(errors="replace").strip())

            except SerialException:
                print("❌ ESP32 disconnected.")
                ser.close()
                ser = wait_for_connection()

    except KeyboardInterrupt:
        print("\n👋 Exiting...")
    finally:
        if ser.is_open:
            ser.close()


if __name__ == "__main__":
    main()
