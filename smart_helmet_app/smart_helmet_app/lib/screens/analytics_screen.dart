import 'package:flutter/material.dart';

class AnalyticsScreen extends StatefulWidget {
  const AnalyticsScreen({super.key});

  @override
  State<AnalyticsScreen> createState() => _AnalyticsScreenState();
}

class _AnalyticsScreenState extends State<AnalyticsScreen> {
  String _selectedPeriod = 'Date';

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: const Color(0xFF1E1E1E),
        title: const Text(
          'Ride Analytics',
          style: TextStyle(color: Colors.orange),
        ),
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
              // Period Selector
              Row(
                children: [
                  const Text(
                    'Select Period:',
                    style: TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(width: 12),
                  DropdownButton<String>(
                    value: _selectedPeriod,
                    dropdownColor: const Color(0xFF1E1E1E),
                    items: ['Date', 'Week', 'Month'].map((String value) {
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
                        _selectedPeriod = value ?? 'Date';
                      });
                    },
                    style: const TextStyle(color: Colors.white),
                    underline: Container(height: 2, color: Colors.orange),
                  ),
                ],
              ),
              const SizedBox(height: 24),
              // Overview Stats
              const Text(
                'Overview',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 12),
              GridView.count(
                crossAxisCount: 2,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                crossAxisSpacing: 12,
                mainAxisSpacing: 12,
                children: [
                  _buildStatCard(
                    'Total Duration',
                    '4 hrs 30 min',
                    Icons.schedule,
                    Colors.blue,
                  ),
                  _buildStatCard(
                    'Average Speed',
                    '48.5 km/h',
                    Icons.speed,
                    Colors.orange,
                  ),
                  _buildStatCard(
                    'Total Distance',
                    '218 km',
                    Icons.route,
                    Colors.green,
                  ),
                  _buildStatCard(
                    'Sudden Accel',
                    '23 times',
                    Icons.rocket,
                    Colors.red,
                  ),
                ],
              ),
              const SizedBox(height: 24),
              // Speed vs Time Graph
              const Text(
                'Speed vs Time',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 12),
              Container(
                decoration: BoxDecoration(
                  color: const Color(0xFF1E1E1E),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.orange.withOpacity(0.5)),
                ),
                padding: const EdgeInsets.all(16),
                height: 200,
                child: Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        Icons.show_chart,
                        size: 60,
                        color: Colors.orange.withOpacity(0.3),
                      ),
                      const SizedBox(height: 12),
                      const Text(
                        'Speed Graph',
                        style: TextStyle(color: Colors.grey),
                      ),
                      const SizedBox(height: 8),
                      const Text(
                        'Shows speed variation over time',
                        style: TextStyle(color: Colors.grey, fontSize: 12),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 24),
              // Detailed Breakdown
              const Text(
                'Detailed Breakdown',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 12),
              Container(
                decoration: BoxDecoration(
                  color: const Color(0xFF1E1E1E),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.orange.withOpacity(0.5)),
                ),
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: [
                    _buildBreakdownRow('Max Speed', '95 km/h', Colors.red),
                    const Divider(color: Colors.grey),
                    _buildBreakdownRow('Min Speed', '0 km/h', Colors.green),
                    const Divider(color: Colors.grey),
                    _buildBreakdownRow('Avg Speed', '48.5 km/h', Colors.orange),
                    const Divider(color: Colors.grey),
                    _buildBreakdownRow('Peak Lean Angle', '42°', Colors.blue),
                    const Divider(color: Colors.grey),
                    _buildBreakdownRow(
                      'Harsh Braking',
                      '18 times',
                      Colors.yellow,
                    ),
                    const Divider(color: Colors.grey),
                    _buildBreakdownRow(
                      'Night Riding Time',
                      '45 min',
                      Colors.indigo,
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatCard(
    String title,
    String value,
    IconData icon,
    Color color,
  ) {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFF1E1E1E),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withOpacity(0.5)),
      ),
      padding: const EdgeInsets.all(12),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, color: color, size: 32),
          const SizedBox(height: 8),
          Text(
            value,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 14,
              fontWeight: FontWeight.bold,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 4),
          Text(
            title,
            style: const TextStyle(color: Colors.grey, fontSize: 11),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  Widget _buildBreakdownRow(String label, String value, Color color) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(color: Colors.grey)),
          Text(
            value,
            style: TextStyle(color: color, fontWeight: FontWeight.bold),
          ),
        ],
      ),
    );
  }
}
