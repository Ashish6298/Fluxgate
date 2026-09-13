/// CONTROLPLANE Flutter SDK Entry Point
library controlplane_flutter;

import 'dart:convert';
import 'package:crypto/crypto.dart';

/// Evaluation Context representation for Flutter client applications.
class EvaluationContext {
  final String? userId;
  final String? anonymousId;
  final String? platform;
  final String? appVersion;
  final String? country;
  final String? language;
  final Map<String, dynamic> customAttributes;

  EvaluationContext({
    this.userId,
    this.anonymousId,
    this.platform = 'flutter',
    this.appVersion,
    this.country,
    this.language,
    this.customAttributes = const {},
  });
}

/// CONTROLPLANE Client for Flutter apps.
class ControlPlane {
  static final ControlPlane _instance = ControlPlane._internal();
  factory ControlPlane() => _instance;
  ControlPlane._internal();

  bool _initialized = false;
  Map<String, dynamic> _activeFlags = {};

  /// Initializes the Flutter SDK with the environment SDK API Key.
  static Future<ControlPlane> initialize({
    required String apiKey,
    String? endpoint,
    Map<String, dynamic>? initialSnapshot,
  }) async {
    final client = ControlPlane();
    client._initialized = true;
    if (initialSnapshot != null && initialSnapshot.containsKey('flags')) {
      final flagsList = initialSnapshot['flags'] as List<dynamic>;
      for (final item in flagsList) {
        if (item is Map<String, dynamic> && item.containsKey('key')) {
          client._activeFlags[item['key'] as String] = item;
        }
      }
    }
    return client;
  }

  /// Evaluates boolean feature flag locally with zero runtime network calls.
  bool isEnabled(String flagKey, {EvaluationContext? context, bool defaultValue = false}) {
    if (!_initialized || !_activeFlags.containsKey(flagKey)) {
      return defaultValue;
    }
    final flag = _activeFlags[flagKey] as Map<String, dynamic>;
    if (flag['enabled'] == false) {
      return (flag['defaultValue'] as bool?) ?? defaultValue;
    }
    return (flag['defaultValue'] as bool?) ?? defaultValue;
  }

  /// Computes deterministic bucket from canonical input matching the cross-SDK contract.
  static int computeBucket(String canonicalInput) {
    final bytes = utf8.encode(canonicalInput);
    final digest = sha256.convert(bytes).toString();
    final hexSlice = digest.substring(0, 8);
    final intVal = int.parse(hexSlice, radix: 16);
    return intVal % 10000;
  }
}
