import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

class AuthService {
  static const String _authKey = 'user_auth';
  static const String _userKey = 'user_data';

  Future<bool> isLoggedIn() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(_authKey) ?? false;
  }

  Future<void> login(String username, String password) async {
    final prefs = await SharedPreferences.getInstance();
    // In a real app, verify credentials against a backend
    await prefs.setBool(_authKey, true);
    await prefs.setString(_userKey, jsonEncode({'username': username}));
  }

  Future<void> signup(String email, String username, String password) async {
    final prefs = await SharedPreferences.getInstance();
    // In a real app, send to backend
    await prefs.setBool(_authKey, true);
    await prefs.setString(
      _userKey,
      jsonEncode({'email': email, 'username': username}),
    );
  }

  Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_authKey, false);
    await prefs.remove(_userKey);
  }

  Future<Map<String, dynamic>> getUserData() async {
    final prefs = await SharedPreferences.getInstance();
    final userJson = prefs.getString(_userKey);
    if (userJson == null) return {};
    return jsonDecode(userJson) as Map<String, dynamic>;
  }
}
