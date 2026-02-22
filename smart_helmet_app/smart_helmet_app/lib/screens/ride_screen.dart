import 'package:flutter/material.dart';

class RideScreen extends StatefulWidget {
  const RideScreen({super.key});

  @override
  State<RideScreen> createState() => _RideScreenState();
}

class _RideScreenState extends State<RideScreen> with TickerProviderStateMixin {
  bool _showAnalytics = false;
  String _selectedPeriod = 'Today';

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: const Color(0xFF1E1E1E),
        title: const Text('Ride Info', style: TextStyle(color: Colors.orange)),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.orange),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Live Ride Metrics',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 16),
              GridView.count(
                crossAxisCount: 2,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                crossAxisSpacing: 12,
                mainAxisSpacing: 12,
                children: [
                  _buildMetricCard(
                    'Speed',
                    '65 km/h',
                    Icons.speed,
                    Colors.orange,
                  ),
                  _buildMetricCard(
                    'Lean Angle',
                    '25°',
                    Icons.rotate_right,
                    Colors.blue,
                  ),
                  _buildMetricCard(
                    'Braking',
                    '40%',
                    Icons.pan_tool,
                    Colors.red,
                  ),
                  _buildMetricCard(
                    'Acceleration',
                    '0.8g',
                    Icons.rocket,
                    Colors.cyan,
                  ),
                  _buildMetricCard(
                    'Road Condition',
                    'Good',
                    Icons.public,
                    Colors.green,
                  ),
                  _buildMetricCard(
                    'Rear Collision',
                    'Clear',
                    Icons.visibility,
                    Colors.greenAccent,
                  ),
                  _buildMetricCard(
                    'Side Proximity',
                    'Safe',
                    Icons.security,
                    Colors.purple,
                  ),
                  _buildMetricCard(
                    'Night Riding',
                    'Off',
                    Icons.nightlight,
                    Colors.indigo,
                  ),
                ],
              ),
              const SizedBox(height: 24),
              GestureDetector(
                onTap: () {
                  setState(() {
                    _showAnalytics = !_showAnalytics;
                  });
                },
                child: Container(
                  decoration: BoxDecoration(
                    color: const Color(0xFF1E1E1E),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.orange.withOpacity(0.5)),
                  ),
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Ride Analytics',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Icon(
                        _showAnalytics ? Icons.expand_less : Icons.expand_more,
                        color: Colors.orange,
                      ),
                    ],
                  ),
                ),
              ),
              if (_showAnalytics) ...[
                const SizedBox(height: 12),
                DropdownButton<String>(
                  value: _selectedPeriod,
                  dropdownColor: const Color(0xFF1E1E1E),
                  items: ['Today', 'This Week', 'This Month'].map((
                    String value,
                  ) {
                    return DropdownMenuItem<String>(
                      value: value,
                      child: Text(
                        value,
                        style: const TextStyle(color: Colors.white),
                      ),
                    );
                  }).toList(),
                  onChanged: (String? value) {
                    setState(() {
                      _selectedPeriod = value ?? 'Today';
                    });
                  },
                  style: const TextStyle(color: Colors.white),
                  underline: Container(height: 2, color: Colors.orange),
                ),
                const SizedBox(height: 16),
                Container(
                  decoration: BoxDecoration(
                    color: const Color(0xFF1E1E1E),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.orange.withOpacity(0.5)),
                  ),
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Session Statistics',
                        style: TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 12),
                      _buildStatRow('Duration', '45 min'),
                      _buildStatRow('Average Speed', '52 km/h'),
                      _buildStatRow('Distance', '39 km'),
                      _buildStatRow('Sudden Acceleration', '12 times'),
                      const SizedBox(height: 12),
                      const Text(
                        'Speed vs Time Graph',
                        style: TextStyle(color: Colors.grey, fontSize: 12),
                      ),
                      Container(
                        margin: const EdgeInsets.only(top: 8),
                        height: 100,
                        decoration: BoxDecoration(
                          color: Colors.black,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Center(
                          child: Icon(
                            Icons.show_chart,
                            size: 40,
                            color: Colors.orange.withOpacity(0.3),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildMetricCard(
    String title,
    String value,
    IconData icon,
    Color color,
  ) {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFF1E1E1E),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withOpacity(0.5)),
      ),
      padding: const EdgeInsets.all(12),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, color: color, size: 28),
          const SizedBox(height: 8),
          Text(
            value,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 14,
              fontWeight: FontWeight.bold,
            ),
          ),
          Text(
            title,
            style: const TextStyle(color: Colors.grey, fontSize: 11),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  Widget _buildStatRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(color: Colors.grey)),
          Text(
            value,
            style: const TextStyle(
              color: Colors.orange,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }
}
