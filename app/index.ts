// Must be first: installs a global crypto.getRandomValues (via expo-crypto) that
// @noble/curves needs for the Friends identity keys, before App pulls it in.
import './src/polyfills/crypto';

import { registerRootComponent } from 'expo';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
