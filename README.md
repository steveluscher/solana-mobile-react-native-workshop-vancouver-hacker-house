# React Native Workshop – Solana Hacker House Vancouver

<img align="right" width="280" alt="QR code link to this repository" src="https://user-images.githubusercontent.com/13243/189549983-32846bb5-751e-4c8f-9cc9-42196e00992b.png">

We're going to build an app that you can use to send tokens from your wallet to another person's wallet, on devnet.

You will learn how to:

- Authorize your app with an SMS Mobile Wallet Adapter compatible wallet
- Reuse a prior wallet authorization over and over
- Sign and send transactions with an SMS Mobile Wallet Adapter compatible wallet

We'll build an app that features:

- A button to airdrop SOL to your wallet on devnet
- A readout of your wallet's current balance
- A QR code scanner you can use to get a recipient's address

## Prerequisites

### Prepare your development environment for React Native

Follow the [&ldquo;Installing Dependencies&rdquo;](https://reactnative.dev/docs/environment-setup#installing-dependencies) instructions of the React Native docs to get a working copy of the Android SDK on your machine. You'll need this to compile the app and run it on an Android simulator or device.

### Download, build, and install the `fakewallet`

As part of the Solana Mobile Stack SDK, you will find a &lsquo;fake&rsquo; Mobile Wallet Adapter compliant wallet. Install it on your Android simulator or device.

1. Get the Mobile Wallet Adapter SDK.
   ```shell
   git clone git@github.com:solana-mobile/mobile-wallet-adapter.git
   ```
2. Open the `android/` folder using Android Studio.
3. Choose &lsquo;fakewallet&rsquo;, choose your device or simulator, and press &lsquo;run&rsquo; to install it.
   <img width="494" alt="image" src="https://user-images.githubusercontent.com/13243/189543624-ef36eafa-c453-47af-acc0-77fdbf3df5ef.png">

## Quick Start

Connect your device if you're using one, then:

```shell
yarn && yarn android
```

## Things to note

### Libraries for preparing and signing transactions

We'll make use of these three libraries from Solana Labs and Solana Mobile to prepare, sign, and send transactions on the network.

```shell
yarn add \
  @solana-mobile/mobile-wallet-adapter-protocol \
  @solana-mobile/mobile-wallet-adapter-protocol-web3js \
  @solana/web3.js
```

### Babel transform for Hermes

Hermes is now the default JavaScript engine in React Native 0.70, but the Hermes transforms are not yet on by default. Enable them with this change to `babel.config.js`.

```diff
  module.exports = {
-   presets: ['module:metro-react-native-babel-preset'],
+   presets: [
+     [
+       'module:metro-react-native-babel-preset',
+       {unstable_transformProfile: 'hermes-stable'},
+     ],
+   ],
};
```

### Polyfills

Certain of our dependencies require polyfills specifically for React Native. First install these dependencies.

```shell
yarn add \
  react-native-get-random-values \
  react-native-url-polyfill
  @craftzdog/react-native-buffer \
  react-native-quick-base64
```

Enable all of them in `index.js`

```typescript
import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
import {Buffer} from '@craftzdog/react-native-buffer';
global.Buffer = Buffer;
```

### Base64 conversion utilities

Mobile Wallet Adapter uses base64-encoded public keys, but libraries like `@solana/web3.js` use base58-encoded public keys. In order to bridge the gap, install a conversion utility.

```shell
yarn add react-native-quick-base64
```

You can use this in your app like this:

```typescript
import {toByteArray} from 'react-native-quick-base64';
import {PublicKey} from '@solana/web3.js';

// When authorizing a wallet...
const [{accounts}] = wallet.authorize(...);
const firstAccount = accounts[0];
// ...the public keys you receive are base64-encoded.
const base64PublicKey = firstAccount.pubkey;
// Convert them to byte arrays before using them with web3.js
const publicKeyByteArray = toByteArray(base64PublicKey);
const publicKey = new PublicKey(publicKeyByteArray);
```

### Simple storage API

You may want to save the address and authentication token of the currently authorized wallet so that you can reuse it between reloads of the app. Install a simple storage solution like this:

```shell
yarn add @react-native-async-storage/async-storage
```

You can use it like this:

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

// Store a string against some key.
await AsyncStorage.setItem('address', 'abc123');
// Then, some time later...
const storedAddress = await AsyncStorage.getItem('address');
```

### QR code scanning capability

Typing in a base58-encoded wallet address is tedious. Let's install a QR code scanner instead.

```shell
yarn add react-native-camera-kit
```

1. Enable the following app permissions in `android/src/main/AndroidManifest.xml`:

   ```xml
   <uses-permission android:name="android.permission.CAMERA" />
   <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE"/>
   ```

2. Open and edit `android/build.gradle`

   - Add the `kotlin_version` to `buildscript.ext`

     ```gradle
     buildscript {
       ext {
         kotlin_version = '1.7.0'
       }
     }
     ```

   - Add the Kotlin classpath to `buildscript.dependencies`
     ```gradle
     dependencies {
       classpath("org.jetbrains.kotlin:kotlin-gradle-plugin:$kotlin_version")
     }
     ```

3. Open and edit `android/app/build.gradle` and add Kotlin imports
   ```gradle
   apply plugin: "kotlin-android"
   apply plugin: "kotlin-android-extensions"
   ```

You can use it like this:

```typescript
import {Camera, CameraType} from 'react-native-camera-kit';

<Camera
  cameraType={CameraType.Back}
  scanBarcode={true}
  onReadCode={(event: any) => {
    const codeContents = event.nativeEvent.codeStringValue;
    console.log(codeContents);
  }}
/>;
```

Read the documentation for React Native Camera Kit [here](https://github.com/teslamotors/react-native-camera-kit).
