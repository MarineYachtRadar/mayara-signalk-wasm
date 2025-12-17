# @marineyachtradar/signalk-wasm

MaYaRa Radar - Multi-brand marine radar integration for SignalK.

This is a WASM plugin for SignalK that provides radar integration for multiple marine radar brands including Furuno, Navico, Raymarine, and Garmin.

## Installation

Install via SignalK App Store or manually:

```bash
npm install @marineyachtradar/signalk-wasm
```

## Requirements

- SignalK Server >= 2.0.0 with WASM plugin support

## Building from Source

Prerequisites:
- Node.js 20+
- Rust with `wasm32-wasip1` target

```bash
# Install Rust WASM target
rustup target add wasm32-wasip1

# Build (downloads GUI from npm automatically)
npm run build

# Build with local GUI (for development)
node build.js --local-gui
```

## License

MIT
