#pragma once

enum class CrashSeverity { NONE, MINOR, SEVERE };

CrashSeverity detectCrash(float accelMagnitude_g, float tiltAngle_deg, int impactDuration_ms);
