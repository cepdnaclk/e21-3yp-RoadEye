// ESP32 Hall Sensor Test
int hallPin = 21;  // Connect sensor OUT pin to GPIO 21 (change if using different pin)

void setup() {
  Serial.begin(115200);   // Serial monitor start
  pinMode(hallPin, INPUT); // Set sensor pin as input
}

void loop() {
  int sensorValue = digitalRead(hallPin); // Read sensor digital output
  Serial.print("Sensor Value: ");
  Serial.println(sensorValue); // Print 0 or 1
  delay(500); // Half a second delay
}