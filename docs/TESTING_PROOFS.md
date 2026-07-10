RoadEye — Testing Proofs and Verification Evidence

Purpose
- Provide concise, auditable proofs for tests performed across backend, mobile, hardware, and end-to-end integration for the RoadEye system. These are designed to be attached to a project audit or presentation.

Instructions
- Do not modify source code when collecting proofs. Use test harnesses, logs, screenshots, and captured network traces.
- Store evidence files under `docs/evidence/` with descriptive names and timestamps.

1. Backend Unit & Integration Tests

What to collect:
- Test run console output (mvn -DskipTests=false test) saved as `docs/evidence/backend_tests_<YYYYMMDD_HHMM>.log`.
- JUnit XML reports (`target/surefire-reports/*.xml`) archived into `docs/evidence/backend_surefire_reports.zip`.
- Code coverage report (Jacoco HTML directory zipped) as `docs/evidence/backend_coverage_<...>.zip`.
- Key screenshots of Postman or cURL responses verifying endpoints (e.g., POST /api/crashes).

Template proof (example):
- File: `docs/evidence/backend_tests_2026-06-15_1200.log`
- Contents excerpt:
  "[INFO] Results:
   Tests run: 512, Failures: 0, Errors: 0, Skipped: 3"
- Associated proof file links: `docs/evidence/backend_surefire_reports.zip`, `docs/evidence/backend_coverage_2026-06-15.zip`

2. Mobile App Tests (React Native)

What to collect:
- Jest test output `docs/evidence/mobile_jest_<...>.log`.
- Screenshot of the running app showing `Dashboard` SOS button and HUD streaming active, `docs/evidence/mobile_dashboard_screenshot.png`.
- Network capture (PCAP) of UDP PCLink traffic during streaming with helmet IP, `docs/evidence/mobile_pclink_stream.pcap`.
- Example Jest test snippet and recorded pass output lines.

Template proof (example):
- File: `docs/evidence/mobile_jest_2026-06-15.log` with excerpt: "Test Suites: 12 passed, 12 total".
- Screenshot file: `docs/evidence/mobile_dashboard_2026-06-15.png`.

3. Hardware & Firmware Tests

What to collect:
- Serial log capture from ESP32 helmet during simulated crash test: `docs/evidence/helmet_serial_crash_2026-06-15.log`.
- Photos/video of physical HUD rendering cross-hair: `docs/evidence/hud_crosshair_2026-06-15.jpg`.
- Multimeter readings / calibration spreadsheets for sensors: `docs/evidence/imu_calibration.csv`.
- BLE sniffer trace (nRF or Wireshark BLE) showing sensor packets: `docs/evidence/ble_sensor_trace.pcap`.

Template proof (example):
- Serial log excerpt showing crash detection and PKT_CRASH send.
- Photo of HUD with timestamp overlay.

4. End-to-End Integration Tests (E2E)

What to collect:
- App logs showing receipt of crash packet and POST to backend: `docs/evidence/e2e_app_crash_flow.log`.
- Backend access logs and DB entry confirming crash stored: `docs/evidence/backend_access_log_crash_2026-06-15.log` and SQL export `docs/evidence/crash_event_row_2026-06-15.sql`.
- SMS delivery receipt from provider (Twilio/Mock) or Expo push delivery receipt: `docs/evidence/twilio_delivery_2026-06-15.json`.
- Timeline document with timestamps and latencies measured.

Template proof (example):
- Timeline excerpt:
  0.501s: Helmet IMU detected acceleration > 2.5g
  0.506s: App POST /api/crashes -> 201 Created (id=...)
  0.605s: Twilio message SID: SMxxxxxxxx

5. Test Evidence Checklist (for auditors)

- [ ] Backend test logs & coverage
- [ ] API integration screenshots or cURL outputs
- [ ] Mobile Jest logs & UI screenshots
- [ ] UDP/PCAP traces for map/audio streaming
- [ ] ESP32 serial logs & BLE traces
- [ ] Photos/video of hardware tests
- [ ] Database row export for crash event(s)
- [ ] SMS/push delivery receipts

6. Repro Steps for Each Proof

Backend unit & integration tests:
- Run:

  mvn clean test

- Save `target/surefire-reports` and `target/jacoco` outputs into `docs/evidence`.

Mobile tests & capture:
- Run unit tests:

  yarn test

- Start Expo app on device; enable remote JS debugging to capture console logs.
- Start UDP listener on PC to capture PCLink with Wireshark: filter `udp.port==4210`.

Hardware crash simulation:
- Connect ESP32 serial at 115200 baud; run scripted input to trigger crash thresholds.
- Record serial output to file:

  python -m serial.tools.miniterm COM3 115200 > docs/evidence/helmet_serial_crash_YYYYMMDD.log

E2E simulation:
- Using dev phone with GPS mock or adb shell to set location.
- Trigger simulated impact on helmet.
- Collect app logs, backend logs, DB export, and Twilio/Expo receipts.

7. Attachment & Archiving

- Keep all evidence under `docs/evidence/` and create `docs/evidence/manifest.json` listing files, test ids, timestamps, and a short description.

Example manifest entry:
{
  "file":"backend_tests_2026-06-15_1200.log",
  "type":"backend-tests",
  "timestamp":"2026-06-15T12:00:00Z",
  "notes":"Full mvn test run; 512 tests passed"
}

8. Presentation Notes

- For slides, include a 1-slide summary per test area with key evidence thumbnails and links to the full files in `docs/evidence/`.
- Use the timeline diagram for the E2E crash-to-notify path with measured latencies.

---

If you'd like, I can now:
- (A) Create the `docs/evidence/manifest.json` template and sample entries,
- (B) Generate example log snippets and placeholder evidence files,
- (C) Add a short slide-ready summary file for `README.md` in `docs/`.

Which of these should I do next?