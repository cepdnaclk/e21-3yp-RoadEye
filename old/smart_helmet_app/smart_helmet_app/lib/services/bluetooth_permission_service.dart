import 'package:permission_handler/permission_handler.dart';
import 'package:flutter_blue_plus/flutter_blue_plus.dart';

class BluetoothPermissionService {
  static Future<bool> requestBluetoothPermissions() async {
    final status = await Permission.bluetooth.request();

    if (await Permission.bluetoothScan.isDenied) {
      await Permission.bluetoothScan.request();
    }

    if (await Permission.bluetoothConnect.isDenied) {
      await Permission.bluetoothConnect.request();
    }

    if (await Permission.location.isDenied) {
      await Permission.location.request();
    }

    return status.isGranted;
  }

  static Future<List<ScanResult>> scanForDevices() async {
    try {
      // Check if Bluetooth is on
      bool isOn =
          await FlutterBluePlus.adapterState.first == BluetoothAdapterState.on;
      if (!isOn) {
        throw Exception('Bluetooth is not enabled');
      }

      // Start scan
      await FlutterBluePlus.startScan(timeout: const Duration(seconds: 10));

      // Get scan results
      final results = await FlutterBluePlus.scanResults.first;
      await FlutterBluePlus.stopScan();

      return results;
    } catch (e) {
      rethrow;
    }
  }

  static Future<void> connectToDevice(BluetoothDevice device) async {
    try {
      await device.connect();
    } catch (e) {
      rethrow;
    }
  }

  static Future<void> disconnectDevice(BluetoothDevice device) async {
    try {
      await device.disconnect();
    } catch (e) {
      rethrow;
    }
  }
}
