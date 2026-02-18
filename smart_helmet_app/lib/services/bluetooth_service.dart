import 'dart:async';
import 'package:flutter_blue_plus/flutter_blue_plus.dart';

class BluetoothService {
  final _connectionStatusController = StreamController<String>.broadcast();

  Stream<String> get connectionStatus => _connectionStatusController.stream;
  Stream<List<ScanResult>> get scanResults => FlutterBluePlus.scanResults;

  BluetoothService() {
    _initializeBluetooth();
  }

  void _initializeBluetooth() {
    FlutterBluePlus.adapterState.listen((state) {
      if (state == BluetoothAdapterState.on) {
        _connectionStatusController.add('Bluetooth Ready');
      } else {
        _connectionStatusController.add('Bluetooth Disabled');
      }
    });
  }

  Future<void> startScan() async {
    await FlutterBluePlus.startScan(timeout: const Duration(seconds: 10));
  }

  Future<void> stopScan() async {
    await FlutterBluePlus.stopScan();
  }

  Future<void> connectToDevice(String deviceName, Function onConnected) async {
    FlutterBluePlus.scanResults.listen((results) {
      for (var r in results) {
        if (r.device.name == deviceName) {
          onConnected(r.device);
          stopScan();
          break;
        }
      }
    });
    await startScan();
  }

  void dispose() {
    _connectionStatusController.close();
  }
}
