import 'package:flutter/material.dart';
import '../services/auth_service.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  bool _notificationsEnabled = true;
  bool _darkModeEnabled = true;
  final _authService = AuthService();

  void _logout() async {
    await _authService.logout();
    if (mounted) {
      Navigator.of(context).pushReplacementNamed('/login');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: const Color(0xFF1E1E1E),
        title: const Text('Settings', style: TextStyle(color: Colors.orange)),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.orange),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: ListView(
        children: [
          // Profile Section
          Container(
            color: const Color(0xFF1E1E1E),
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Container(
                  width: 60,
                  height: 60,
                  decoration: BoxDecoration(
                    color: Colors.orange,
                    shape: BoxShape.circle,
                  ),
                  child: const Center(
                    child: Icon(Icons.person, color: Colors.black, size: 32),
                  ),
                ),
                const SizedBox(width: 16),
                const Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'User Profile',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    SizedBox(height: 4),
                    Text(
                      'user@roadeye.com',
                      style: TextStyle(color: Colors.grey, fontSize: 14),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          // General Settings
          _buildSectionTitle('General Settings'),
          _buildSwitchTile('Dark Mode', _darkModeEnabled, (value) {
            setState(() {
              _darkModeEnabled = value;
            });
          }),
          _buildSwitchTile('Notifications', _notificationsEnabled, (value) {
            setState(() {
              _notificationsEnabled = value;
            });
          }),
          const SizedBox(height: 16),
          // Device Settings
          _buildSectionTitle('Device Settings'),
          _buildListTile('Bluetooth Devices', Icons.bluetooth),
          _buildListTile('Helmet Configuration', Icons.settings_suggest),
          _buildListTile('Sound & Vibration', Icons.volume_up),
          const SizedBox(height: 16),
          // Safety Settings
          _buildSectionTitle('Safety Settings'),
          _buildListTile('Collision Detection', Icons.security),
          _buildListTile('Weather Alerts', Icons.cloud),
          _buildListTile('Night Riding Mode', Icons.nightlight),
          const SizedBox(height: 16),
          // About Section
          _buildSectionTitle('About'),
          _buildListTile('App Version', Icons.info, trailing: 'v1.0.0'),
          _buildListTile('Help & Support', Icons.help),
          _buildListTile('Privacy Policy', Icons.description),
          _buildListTile('Terms of Service', Icons.description),
          const SizedBox(height: 16),
          // Logout
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: SizedBox(
              width: double.infinity,
              height: 50,
              child: ElevatedButton.icon(
                onPressed: _logout,
                icon: const Icon(Icons.logout),
                label: const Text('Logout'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.red,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
      child: Text(
        title,
        style: const TextStyle(
          color: Colors.orange,
          fontSize: 14,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }

  Widget _buildSwitchTile(String title, bool value, Function(bool) onChanged) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      decoration: BoxDecoration(
        color: const Color(0xFF1E1E1E),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.orange.withOpacity(0.3)),
      ),
      child: ListTile(
        title: Text(title, style: const TextStyle(color: Colors.white)),
        trailing: Switch(
          value: value,
          onChanged: onChanged,
          activeColor: Colors.orange,
        ),
      ),
    );
  }

  Widget _buildListTile(String title, IconData icon, {String? trailing}) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      decoration: BoxDecoration(
        color: const Color(0xFF1E1E1E),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.orange.withOpacity(0.3)),
      ),
      child: ListTile(
        leading: Icon(icon, color: Colors.orange),
        title: Text(title, style: const TextStyle(color: Colors.white)),
        trailing: trailing != null
            ? Text(trailing, style: const TextStyle(color: Colors.grey))
            : Icon(Icons.arrow_forward, color: Colors.orange),
        onTap: () {
          // Handle navigation or action
        },
      ),
    );
  }
}
