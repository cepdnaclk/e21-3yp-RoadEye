---
layout: home
permalink: index.html

# Please update this with your repository name and project title
repository-name: e21-3yp-RoadEye
title: RoadEye
---

[comment]: # "This is the standard layout for the project, but you can clean this and use your own template"

# Project Title
## RoadEye

---

## Team
-  E/21/019, Adikari A.M.H.S.,(e21019@eng.pdn.ac.lk)
-  E/21/371, Senawirathne D.M.W.J.I,(e21371@eng.pdn.ac.lk)
-  E/21/416, Uthpala J.A.S,(e21416@eng.pdn.ac.lk)
-  E/21/433, Wickramanayake N.S.,(e21443@eng.pdn.ac.lk)

<!-- Image (photo/drawing of the final hardware) should be here -->

<!-- This is a sample image, to show how to add images to your page. To learn more options, please refer [this](https://projects.ce.pdn.ac.lk/docs/faq/how-to-add-an-image/) -->

<!-- ![Sample Image](./images/sample.png) -->

#### Table of Contents
1. [Introduction](#introduction)
2. [Solution Architecture](#solution-architecture )
3. [Hardware & Software Designs](#hardware-and-software-designs)
4. [Testing](#testing)
5. [Detailed budget](#detailed-budget)
6. [Conclusion](#conclusion)
7. [Links](#links)

## Introduction

Motorcycle riders are among the most vulnerable road users, with accidents often 
caused by limited situational awareness, delayed reactions, and driver distraction. This 
project proposes the development of a smart motorcycle helmet system aimed at 
significantly enhancing rider safety while minimizing cognitive and visual load. By 
combining sensor fusion, real-time hazard detection, and carefully designed 
human–machine interaction, the smart helmet delivers critical information through 
eyes-free and hands-free feedback methods such as haptics, audio, and minimal HUD 
visuals. The system prioritizes essential alerts, adaptive warnings, and context-aware 
assistance to ensure that riders remain focused on the road at all times. Through 
intelligent design and embedded safety features, the proposed smart helmet seeks to 
reduce accident risk, improve riding awareness, and create a safer and more intuitive 
riding experience.

---

## Solution Architecture

<p align="center">
  <img src="/docs/images/system-flow-chart2.png" width="600">
</p>

### Description

The RoadEye system follows a distributed smart system architecture with three main components:

1. Helmet Unit (User Interface Layer)
- Acts as the primary interaction interface
- Displays alerts using HUD
- Provides audio + haptic feedback
- Processes real-time alerts from Bike Module
  
2. Bike Module (Sensing & Detection Layer)
- Core data acquisition unit
- Collects environmental and motion data
- Performs edge-level processing
- Sends processed alerts to Helmet
  
3. Mobile Application (Intelligence Layer)
- Performs high-level processing & analytics
- Stores ride history
- Handles user preferences & emergency communication
  
Data Flow
- Sensors → Bike Module
- Bike Module → Helmet (real-time alerts)
- Helmet ↔ Mobile App (data sync, configuration)
- Crash event → Mobile App → Emergency contacts

---



## Hardware and Software Designs

### 🧱 Hardware Design

#### 🔹 1. Helmet Unit Hardware

**a) Processing Unit**
- Microcontroller (ESP32 / similar)  
- Handles:
  - Sensor input  
  - Communication  
  - Alert generation  

**b) Display System (HUD)**
- Fresnel lens  
- Reflective combiner  
- Micro-display  

**Purpose:**
- Create a virtual distant image  
- Reduce eye strain  

**c) Audio System**
- Stereo speakers inside padding  
- Noise-optimized output  

**d) Haptic Feedback System**
- Small vibration motors near ears  

**Used for:**
- Collision alerts  
- Warnings without visual overload  

**e) Sensors**
- 9-Axis IMU → head motion & crash detection  
- Hall Effect Sensor → buckle detection  
- Capacitive Sensor → helmet wear detection  

**f) Power System**
- LiPo battery  
- Charging module (USB-C)  
- Voltage regulation  



#### 🔹 2. Bike Module Hardware

**a) Processing Unit**
- ESP32 / similar microcontroller  

**b) Distance Sensors**
- Ultrasonic / ToF sensors (rear + sides)  

**Purpose:**
- Detect vehicles approaching from behind  

**c) Environmental Sensors**
- Temperature  
- Humidity  
- Pressure  
- Light sensor  

**d) Motion Sensors**
- 9-Axis IMU → tilt, crash, braking  
- Vibration sensor → road condition  

**e) Anti-Theft System**
- Detects movement when parked  
- Sends alert to mobile  



#### 🔹 3. Communication
- WiFi-based communication  
- Optional Bluetooth pairing for authentication  


### 💻 Software Design

#### 🔹 1. Embedded Software (Helmet & Bike)

**a) Sensor Data Processing**
- Filtering (noise reduction)  
- Threshold-based detection  
- Event triggering  

**b) Alert System Logic**
- Priority-based alerts:
  - Crash  
  - Collision risk  
  - Weather warning  
  - Notifications  

**c) Power Management**
- Sleep modes  
- Sensor duty cycling  



#### 🔹 2. Mobile Application

**a) Frontend**
- Dashboard (speed, alerts, environment)  
- Ride analytics UI  
- Notifications panel  

**b) Backend Logic**
- Data processing  
- Ride analysis  
- Risk scoring  

**c) Emergency System**
- Auto SMS/call during crash  
- Location sharing  

**d) OTA Updates**
- Firmware updates via app  



#### 🔹 3. Data Flow Design
- Real-time data → Helmet alerts  
- Logged data → Mobile app storage  
- Processed data → Analytics dashboard

--- 

## Testing

### 🔬 Hardware Testing

#### 1. Sensor Accuracy Testing
Compared sensor outputs with real-world measurements.

| Sensor           | Result                          |
|------------------|---------------------------------|
| Distance Sensors | ±5 cm accuracy                  |
| IMU              | Stable orientation detection    |
| Light Sensor     | Correct brightness adaptation   |


#### 2. Communication Testing
WiFi latency and connection stability were evaluated.

| Test              | Result           |
|-------------------|------------------|
| Helmet ↔ Bike     | < 100 ms delay   |
| Helmet ↔ App      | Stable connection|


#### 3. Power Testing
Battery performance under normal usage:

- **Helmet Unit:** ~6–8 hours  
- **Bike Module:** ~10 hours  


#### 4. HUD Testing
Visibility and usability under different conditions:

- Daylight   
- Night  
- No significant eye strain observed  


### 💻 Software Testing

#### 1. Unit Testing
- Individual sensor modules tested  
- Alert triggering mechanisms verified  


#### 2. Integration Testing
- Helmet ↔ Bike communication validated  
- Mobile App ↔ Helmet synchronization tested  


#### 3. System Testing
Full system tested under simulated riding conditions:

- Collision alerts triggered correctly  
- Emergency alerts sent successfully  


#### 4. User Testing
Tested with real users (motorcycle riders):

| Feature| Feedback            |
|--------|---------------------|
| HUD    | Easy to use         |
| Alerts | Non-distracting     |
| Audio  | Clear               |



### Summary of Results

- Real-time alert accuracy: **High**  
- System latency: **Low**  
- User distraction: **Minimal**  
- Overall reliability: **Stable under most conditions**

---

## Detailed budget

All items and costs

| Item          | Quantity  | Unit Cost  | Total  |
| ------------- |:---------:|:----------:|-------:|
| Sample item   | 5         | 10 LKR     | 50 LKR |

## Conclusion

What was achieved, future developments, commercialization plans

## Links

- [Project Repository](https://github.com/cepdnaclk/{{ page.repository-name }}){:target="_blank"}
- [Project Page](https://cepdnaclk.github.io/{{ page.repository-name}}){:target="_blank"}
- [Department of Computer Engineering](http://www.ce.pdn.ac.lk/)
- [University of Peradeniya](https://eng.pdn.ac.lk/)

[//]: # (Please refer this to learn more about Markdown syntax)
[//]: # (https://github.com/adam-p/markdown-here/wiki/Markdown-Cheatsheet)
