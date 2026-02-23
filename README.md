___
# 🛵 RoadEye – Smart Motorcycle Safety System
___

# e21-3yp-project - Group 15
- E/21/019
- E/21/371
- E/21/416
- E/21/433

# 📌 Introduction

RoadEye is an intelligent motorcycle safety enhancement system designed to improve rider awareness, reduce accidents, and provide real-time critical information without increasing distraction.
Unlike modern cars, motorcycles lack advanced driver-assistance systems. Riders rely almost entirely on vision, which becomes limited due to:
- Reduced situational awareness
- Poor visibility in weather conditions
- Rider distraction
- Helmet-induced blind spots
RoadEye addresses these limitations through a Helmet Unit, Bike Module, and Mobile Application, working together to create a safer, smarter riding experience.

# 🎯 Main Objectives

Enhance rider safety and awareness
Minimize visual and mental distractions
Detect dangerous situations before they escalate
Enable emergency response and crash alerts

# 🧠 Design Principles

Minimally distracting interface
Context-aware alerts
Modular & scalable architecture
Low power consumption
Hands-free interaction

# 👥 Target Users

Daily motorcycle commuters
Long-distance riders
Delivery drivers

# 🌍 Expected Impact

Reduced accident risk
Improved situational awareness
Better riding habits
Faster emergency response

# 🧩 System Architecture
RoadEye consists of three major components:

1️⃣ Helmet Unit
Features
- Heads-Up Display (HUD)
- Stereo speakers embedded in padding
- Haptic motors near ears
- LED strip for rear visibility
- Helmet buckle detection
- Gesture detection

Sensors & Hardware

- 9-Axis IMU (head motion, crash detection)
- Hall effect sensor (buckle state)
- Capacitive button (wear detection)
- Microphone & speakers
- LiPo battery & charging circuit

HUD Optical Solution

Human eyes cannot safely focus on near displays while riding.

Solution:
- Fresnel lens + reflective combiner
- Creates a virtual distant image
- Reduces eye strain
- Minimizes distraction

2️⃣ Bike Module

Mounted at the rear of the motorcycle.

Sensors

- 3 Distance sensors (rear & side proximity)
- 9-Axis IMU (acceleration, braking, tilt, crash detection)
- Humidity, altitude, pressure, temperature sensors
- Ambient light sensor
- Vibration sensor (road condition detection)

Functions

- Proximity warnings
- Collision detection
- Road condition monitoring
- Environmental data fusion
- Anti-theft detection (parking mode)

3️⃣ Mobile Application

Role
- High-level intelligence
- Data visualization
- User customization
- Emergency contact alerts
- OTA firmware updates

App Functions
- Navigation & traffic
- Weather alerts
- Smart notifications
- Ride analytics & history
- Emergency contact system

Data Handling
- Stores and analyzes sensor data
- Generates ride summaries
- Provides analytics by date/week/month

# 📡 Communication Architecture
- Helmet ↔ Bike Module → WiFi

- Helmet ↔ Mobile App → WiFi

- Helmet ↔ Helmet → WiFi (future support)

# 🚨 Smart Safety Features

Collision Warnings
- Rear and side proximity alerts
- Dynamic threshold adjustments in rain/fog

Weather Awareness
- Rain & fog detection
- Wet road condition alerts
- Weather-based risk adjustment

Night Riding Mode
- Automatic HUD brightness control
- Adjusted collision sensitivity

Riding Habit Analysis
- Aggressive acceleration detection
- Harsh braking detection
- Excessive lean monitoring

Crash Detection
- Automatic emergency contact notification

Helmet Buckle Reminder
- Alerts if strap is not secured

Anti-Theft Protection
- Tampering detection in parking mode

# 🔐 Security & Privacy
Security
- Bluetooth pairing authentication
- Secure OTA firmware updates
- Encrypted device-to-device communication

Privacy
- User-controlled data storage
- No continuous cloud tracking
- Emergency data shared only during crashes

### Enable GitHub Pages

You can put the things to be shown in GitHub pages into the _docs/_ folder. Both html and md file formats are supported. You need to go to settings and enable GitHub pages and select _main_ branch and _docs_ folder from the dropdowns, as shown in the below image.

![image](https://user-images.githubusercontent.com/11540782/98789936-028d3600-2429-11eb-84be-aaba665fdc75.png)

### Special Configurations

These projects will be automatically added into [https://projects.ce.pdn.ac.lk](). If you like to show more details about your project on this site, you can fill the parameters in the file, _/docs/index.json_

```
{
  "title": "This is the title of the project",
  "team": [
    {
      "name": "Team Member Name 1",
      "email": "email@eng.pdn.ac.lk",
      "eNumber": "E/yy/xxx"
    },
    {
      "name": "Team Member Name 2",
      "email": "email@eng.pdn.ac.lk",
      "eNumber": "E/yy/xxx"
    },
    {
      "name": "Team Member Name 3",
      "email": "email@eng.pdn.ac.lk",
      "eNumber": "E/yy/xxx"
    }
  ],
  "supervisors": [
    {
      "name": "Dr. Supervisor 1",
      "email": "email@eng.pdn.ac.lk"
    },
    {
      "name": "Supervisor 2",
      "email": "email@eng.pdn.ac.lk"
    }
  ],
  "tags": ["Web", "Embedded Systems"]
}
```

Once you filled this _index.json_ file, please verify the syntax is correct. (You can use [this](https://jsonlint.com/) tool).

### Page Theme

A custom theme integrated with this GitHub Page, which is based on [github.com/cepdnaclk/eYY-project-theme](https://github.com/cepdnaclk/eYY-project-theme). If you like to remove this default theme, you can remove the file, _docs/\_config.yml_ and use HTML based website.
