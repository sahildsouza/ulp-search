# ULP Data Stream Inspector ⚡ Snapdragon 8 Elite

Production-grade User-Log-Pass (ULP) Data Stream Inspector optimized for Android Termux running on Qualcomm Snapdragon 8 Elite (Oryon CPU architecture). Streams unlimited ripgrep (`rg`) search results over Server-Sent Events (SSE) from 1GB+ log files in `~/logs/`.

---

## 🚀 One Easy Run Command for Termux

Inside the project directory, run:

```bash
./start.sh
```

*(or simply: `npm start`)*

This single command automatically:
1. Detects Termux and verifies Node.js & Ripgrep (`rg`).
2. Installs dependencies if needed (`npm install`).
3. Verifies production bundle build.
4. Checks/creates `~/logs` directory.
5. Starts the Fastify SSE engine on **Port 80**!

---

## 🌐 Access the Web UI

Since Port 80 is the default HTTP port, you don't even need to type a port number:

- **From your Android phone browser:**
  ```text
  http://localhost
  ```
- **From another device / PC on the same Wi-Fi:**
  ```text
  http://<phone-ip-address>
  ```

---

## ⚙️ Port 80 & Root Privileges in Termux

- **Rooted Device (KernelSU / Magisk / tsu):**
  Port 80 works directly. If preferred:
  ```bash
  tsu -c "npm start"
  ```
- **Non-Root Device:**
  If Termux lacks root permission to bind port 80 (<1024), the server **automatically detects this and falls back to port 8080** without crashing:
  ```text
  http://localhost:8080
  ```
- **Custom Port Override:**
  ```bash
  PORT=3000 npm start
  ```

---

## 🧪 Verification & Tests

To run the integration test suite:
```bash
npm run test:e2e
```
