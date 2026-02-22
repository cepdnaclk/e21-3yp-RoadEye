import 'package:flutter/material.dart';

class AlertsScreen extends StatefulWidget {
  const AlertsScreen({super.key});

  @override
  State<AlertsScreen> createState() => _AlertsScreenState();
}

class _AlertsScreenState extends State<AlertsScreen> {
  final List<Map<String, dynamic>> alerts = [
    {
      'type': 'Collision Warning',
      'message': 'Potential collision detected',
      'severity': 'critical',
      'time': '2 min ago',
    },
    {
      'type': 'Weather Alert',
      'message': 'Heavy rain approaching',
      'severity': 'warning',
      'time': '5 min ago',
    },
    {
      'type': 'Mechanical Anomaly',
      'message': 'Engine temperature high',
      'severity': 'warning',
      'time': '10 min ago',
    },
    {
      'type': 'Helmet Buckle',
      'message': 'Helmet not properly fastened',
      'severity': 'critical',
      'time': '15 min ago',
    },
    {
      'type': 'Theft Alert',
      'message': 'Unauthorized movement detected',
      'severity': 'critical',
      'time': '1 hour ago',
    },
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: const Color(0xFF1E1E1E),
        title: const Text(
          'Alerts & Notifications',
          style: TextStyle(color: Colors.orange),
        ),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.orange),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: alerts.length,
        itemBuilder: (context, index) {
          final alert = alerts[index];
          final isWarning = alert['severity'] == 'warning';
          final isCritical = alert['severity'] == 'critical';

          return Container(
            margin: const EdgeInsets.only(bottom: 12),
            decoration: BoxDecoration(
              color: const Color(0xFF1E1E1E),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: isCritical ? Colors.red : Colors.yellow,
                width: 2,
              ),
            ),
            padding: const EdgeInsets.all(12),
            child: Row(
              children: [
                Container(
                  width: 50,
                  height: 50,
                  decoration: BoxDecoration(
                    color: isCritical
                        ? Colors.red.withOpacity(0.2)
                        : Colors.yellow.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Center(
                    child: Icon(
                      isCritical ? Icons.error : Icons.warning,
                      color: isCritical ? Colors.red : Colors.yellow,
                      size: 28,
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        alert['type'],
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                          fontSize: 14,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        alert['message'],
                        style: const TextStyle(
                          color: Colors.grey,
                          fontSize: 12,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        alert['time'],
                        style: const TextStyle(
                          color: Colors.grey,
                          fontSize: 10,
                        ),
                      ),
                    ],
                  ),
                ),
                Icon(
                  Icons.notifications_active,
                  color: isCritical ? Colors.red : Colors.yellow,
                  size: 20,
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}
