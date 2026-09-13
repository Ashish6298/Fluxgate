# controlplane_flutter

Official Flutter SDK for CONTROLPLANE.

## Features

- 100% In-memory local feature flag evaluation (zero network calls per evaluation).
- Last Known Good (LKG) local caching.
- Deterministic percentage rollouts and context targeting.

## Usage

```dart
import 'package:controlplane_flutter/controlplane_flutter.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  final cp = await ControlPlane.initialize(
    apiKey: 'YOUR_SDK_KEY',
  );

  final isCheckoutEnabled = cp.isEnabled('new_checkout', defaultValue: false);
}
```
