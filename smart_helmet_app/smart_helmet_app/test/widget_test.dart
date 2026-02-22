// This is a basic Flutter widget test for the Smart Helmet Dashboard.
//
// To perform an interaction with a widget in your test, use the WidgetTester
// utility in the flutter_test package. For example, you can send tap and scroll
// gestures. You can also use WidgetTester to find child widgets in the widget
// tree, read text, and verify that the values of widget properties are correct.

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:smart_helmet_app/main.dart';

void main() {
  testWidgets('Smart Helmet Dashboard renders correctly', (
    WidgetTester tester,
  ) async {
    // Build our app and trigger a frame.
    await tester.pumpWidget(const RoadEyeApp());

    // Verify that the dashboard title is displayed.
    expect(find.text('Smart Helmet Dashboard'), findsOneWidget);

    // Verify that the initial connection status is shown.
    expect(find.text('Helmet Not Connected'), findsOneWidget);

    // Verify that the speed value is displayed.
    expect(find.byType(Text), findsWidgets);

    // Verify that the connect button is present.
    expect(find.byType(ElevatedButton), findsOneWidget);

    // Tap the connect button.
    await tester.tap(find.byType(ElevatedButton));
    await tester.pumpAndSettle();

    // Verify the app is still responsive after button tap.
    expect(find.text('Smart Helmet Dashboard'), findsOneWidget);
  });
}
