# CLARA Kiosk — Hardware Specification

This project is developed for a **fixed hardware kiosk environment**. All architecture, backend, and frontend decisions must be compatible with the following setup.

---

## Operating System

- **Ubuntu** (latest LTS)

---

## Primary Compute

| Component | Specification |
|-----------|---------------|
| Device | Beelink S12 Pro |
| CPU | Intel N100 |
| RAM | 16GB |
| Storage | 512GB SSD |
| Graphics | Intel UHD Graphics (integrated) |
| GPU | **No dedicated GPU** |
| Operation | System must run **24/7** and remain **thermally stable** |

---

## Peripherals (USB)

| Function | Device |
|----------|--------|
| Camera | Logitech C920 HD Webcam (USB) |
| Microphone | ReSpeaker USB Mic Array v2.0 (USB) |
| Speaker | JBL Pebbles USB Speaker (USB audio) |

---

## Display

- **Waveshare 13.3" 1080p Touch Display**
- HDMI for display
- USB for touch input

---

## Network

- **Wired Ethernet** connection

---

## Important Constraints

- **No GPU-heavy solutions**
- **No large local LLMs**
- **Prioritize low CPU usage and stability**
- **Assume USB-based peripherals**
- **Suitable for kiosk deployment** (unattended, 24/7)
- **Optimized for long-term reliability**

---

## What NOT to Assume

- ❌ Raspberry Pi
- ❌ NVIDIA GPU
- ❌ High-end workstation hardware

---

All code generation and architecture decisions in this project must assume this exact hardware setup, including frontend (e.g. avoid heavy GPU/WebGL usage; keep 1080p and Intel UHD in mind).
