// main.dart
import 'package:flutter/material.dart';
import 'screens/splash_screen.dart';
import 'screens/login_screen.dart';
import 'screens/signup_screen.dart';
import 'screens/dashboard_screen.dart';
import 'screens/map_screen.dart';
import 'screens/ride_screen.dart';
import 'screens/alerts_screen.dart';
import 'screens/analytics_screen.dart';
import 'screens/settings_screen.dart';

void main() {
  runApp(const RoadEyeApp());
}

class RoadEyeApp extends StatefulWidget {
  const RoadEyeApp({super.key});

  static void setTheme(BuildContext context, bool isDarkMode) {
    final state = context.findAncestorStateOfType<_RoadEyeAppState>();
    state?.setTheme(isDarkMode);
  }

  @override
  State<RoadEyeApp> createState() => _RoadEyeAppState();
}

class _RoadEyeAppState extends State<RoadEyeApp> {
  bool _isDarkMode = true;

  void setTheme(bool isDarkMode) {
    setState(() {
      _isDarkMode = isDarkMode;
    });
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'RoadEye',
      theme: _isDarkMode
          ? ThemeData.dark(useMaterial3: true)
          : ThemeData.light(useMaterial3: true),
      initialRoute: '/splash',
      routes: {
        '/splash': (context) => const SplashScreen(),
        '/login': (context) => const LoginScreen(),
        '/signup': (context) => const SignupScreen(),
        '/dashboard': (context) => const DashboardScreen(),
        '/map': (context) => const MapScreen(),
        '/ride': (context) => const RideScreen(),
        '/alerts': (context) => const AlertsScreen(),
        '/analytics': (context) => const AnalyticsScreen(),
        '/settings': (context) => const SettingsScreen(),
      },
    );
  }
}
