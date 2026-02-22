**Smart Helmet Mobile Application**  
---
**📌 Overview**

**The Smart Helmet Mobile Application is a Flutter-based cross-platform mobile app developed as part of a Smart Helmet safety system. The app connects to a Bluetooth-enabled helmet (ESP32-based) to monitor helmet connectivity and support future rider safety features.
This project is currently under development, with the mobile application serving as the foundation for real-time communication between the helmet hardware and the user**

---

**🎯 Project Objectives:**  

- **Establish reliable Bluetooth communication** between the helmet and the mobile app  
- **Display helmet connection status** in real time  
- **Build a scalable mobile interface** for future safety features  
- **Integrate hardware and software** for an IoT-based safety system  

---

**✨ Features:**  

**✅ Implemented:**  
- **Flutter-based cross-platform UI** (Android, iOS, Web, Desktop)  
- **Bluetooth Low Energy (BLE) scanning** using flutter_blue_plus  
- **Helmet discovery** via device name  
- **Real-time connection status display**  
- **Clean and simple dashboard UI**  

**🚧 Planned Features:**  
- **Automatic helmet connection**  
- **Speed monitoring** from helmet sensors  
- **Accident / fall detection alerts**  
- **Rider safety notifications**  
- **Battery level monitoring** of helmet  
- **Cloud data storage and analytics**  

---

**🛠️ Tech Stack:**  

**Mobile Application:**  
- **Framework:** Flutter  
- **Language:** Dart  
- **Bluetooth:** flutter_blue_plus (BLE)  
- **UI:** Material Design  

**Hardware (In Progress):**  
- **Microcontroller:** ESP32  
- **Communication:** Bluetooth Low Energy (BLE)  
- **Sensors (Planned):** Speed, motion, impact detection  

---

**🚀 Getting Started:**  

**Prerequisites:**  
- Flutter SDK installed  
- Android Studio / VS Code  
- Android phone or emulator  
- Bluetooth-enabled device  
- Developer Mode & USB Debugging enabled on phone  

---

**📱 Bluetooth Usage:**  
- The app **scans for nearby BLE devices**  
- The helmet **advertises using a specific device name** (e.g., ESP32Helmet)  
- When detected, the app **updates the connection status**  

---

**🔐 Permissions:**  
- Bluetooth  
- Bluetooth Scan  
- Bluetooth Connect  
- Location (required by Android for BLE scanning)  

---

**📌 Current Status:**  
🟡 **In Development**  
This project is currently developed as an academic and research-based system.  
