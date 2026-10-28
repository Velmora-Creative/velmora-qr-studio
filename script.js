
"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const $ = (id) => document.getElementById(id);

  const mode = $("content-mode");
  const textFields = $("text-fields");
  const wifiFields = $("wifi-fields");
  const content = $("qr-content");
  const ssid = $("wifi-ssid");
  const password = $("wifi-password");
  const security = $("wifi-security");
  const hidden = $("wifi-hidden");

  const qrColor = $("qr-color");
  const bgColor = $("bg-color");
  const qrColorValue = $("qr-color-value");
  const bgColorValue = $("bg-color-value");

  const generateBtn = $("generate-btn");
  const downloadBtn = $("download-btn");
  const qrContainer = $("qrcode");
  const placeholder = $("qr-placeholder");
  const status = $("status");
  const previewTitle = $("preview-title");
  const previewDescription = $("preview-description");

  let payload = "";
  let payloadColor = "";
  let payloadBackground = "";
  let version = 0;

  function setStatus(message, error = false) {
    status.textContent = message;
    status.style.color = error ? "#b42318" : "#24845f";
  }

  function clearPreview() {
    version++;
    qrContainer.replaceChildren();
    qrContainer.style.display = "none";
    placeholder.style.display = "block";
    downloadBtn.disabled = true;

    payload = "";
    payloadColor = "";
    payloadBackground = "";

    previewTitle.textContent = "Your QR, your way.";
    previewDescription.textContent =
      "A little code that connects people to your world.";
  }

  function updateColorLabels() {
    qrColorValue.textContent = qrColor.value.toUpperCase();
    bgColorValue.textContent = bgColor.value.toUpperCase();
  }

  function luminance(hex) {
    const rgb = hex.match(/[a-f\d]{2}/gi).map((part) => {
      let value = parseInt(part, 16) / 255;

      return value <= 0.04045
        ? value / 12.92
        : ((value + 0.055) / 1.055) ** 2.4;
    });

    return 0.2126 * rgb[0] +
      0.7152 * rgb[1] +
      0.0722 * rgb[2];
  }

  function hasEnoughContrast(foreground, background) {
    const a = luminance(foreground);
    const b = luminance(background);
    return (Math.max(a, b) + 0.05) /
      (Math.min(a, b) + 0.05) >= 3;
  }

  function escapeWifiValue(value) {
    return value.replace(/([\\;,:"])/g, "\\$1");
  }

  function getPayload() {
    if (mode.value === "text") {
      const value = content.value.trim();

      if (!value) {
        throw new Error("Enter a URL or some text first.");
      }

      return {
        value,
        title: "Your QR code is ready.",
        description: "Scan it with your phone camera to test it."
      };
    }

    const network = ssid.value;

    if (!network.trim()) {
      throw new Error("Enter your Wi-Fi network name.");
    }

    if (network.length > 200) {
      throw new Error("Your network name is too long.");
    }

    const type = security.value;
    const pass = password.value;

    if (type !== "nopass" && !pass) {
      throw new Error("Enter your Wi-Fi password.");
    }

    if (pass.length > 200) {
      throw new Error("Your Wi-Fi password is too long.");
    }

    let value = `WIFI:T:${type};S:${escapeWifiValue(network)};`;

    if (type !== "nopass") {
      value += `P:${escapeWifiValue(pass)};`;
    }

    value += `H:${hidden.checked ? "true" : "false"};;`;

    return {
      value,
      title: "Your Wi-Fi QR is ready.",
      description: "Scan with a compatible device to join your network."
    };
  }

  function generateQRCode() {
    let result;

    try {
      result = getPayload();
    } catch (error) {
      clearPreview();
      setStatus(error.message, true);
      return;
    }

    if (qrColor.value === bgColor.value) {
      clearPreview();
      setStatus("Choose different QR and background colors.", true);
      return;
    }

    if (!hasEnoughContrast(qrColor.value, bgColor.value)) {
      clearPreview();
      setStatus("Low contrast. Try a darker QR color.", true);
      return;
    }

    if (typeof window.QRCode !== "function") {
      clearPreview();
      setStatus("QR library failed to load. Check your internet.", true);
      return;
    }

    const currentVersion = ++version;
    qrContainer.replaceChildren();
    qrContainer.style.display = "block";
    placeholder.style.display = "none";
    downloadBtn.disabled = true;
    setStatus("Generating QR code...");

    try {
      new window.QRCode(qrContainer, {
        text: result.value,
        width: 240,
        height: 240,
        colorDark: qrColor.value,
        colorLight: bgColor.value,
        correctLevel: window.QRCode.CorrectLevel.H
      });

      payload = result.value;
      payloadColor = qrColor.value;
      payloadBackground = bgColor.value;

      previewTitle.textContent = result.title;
      previewDescription.textContent = result.description;

      window.setTimeout(() => {
        if (currentVersion !== version) return;

        const canvas = qrContainer.querySelector("canvas");

        if (canvas && canvas.width > 0) {
          downloadBtn.disabled = false;
          setStatus("QR code generated successfully!");
        } else {
          clearPreview();
          setStatus("Couldn't render the QR code. Try again.", true);
        }
      }, 250);
    } catch (error) {
      clearPreview();
      setStatus("QR generation failed. Please try again.", true);
    }
  }

  function downloadQRCode() {
    const original = qrContainer.querySelector("canvas");

    if (!payload || !original) {
      setStatus("Generate a QR code before downloading.", true);
      return;
    }

    try {
      const border = 20;
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");

      if (!context) throw new Error("Canvas unavailable");

      canvas.width = original.width + border * 2;
      canvas.height = original.height + border * 2;

      context.fillStyle = payloadBackground;
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(original, border, border);

      const link = document.createElement("a");
      link.download = "velmora-qr-code.png";
      link.href = canvas.toDataURL("image/png");
      link.click();

      setStatus("Your PNG download has started!");
    } catch (error) {
      setStatus("Download failed. Please try again.", true);
    }
  }

  function updateMode() {
    clearPreview();

    const wifi = mode.value === "wifi";
    textFields.hidden = wifi;
    wifiFields.hidden = !wifi;

    setStatus(wifi
      ? "Enter your Wi-Fi details to get started."
      : "Enter a URL or text to get started.");
  }

  function updateColors() {
    updateColorLabels();

    if (payload) generateQRCode();
  }

  function invalidatePreview() {
    if (payload) {
      clearPreview();
      setStatus("Content changed. Generate a new QR code.");
    }
  }

  mode.addEventListener("change", updateMode);
  generateBtn.addEventListener("click", generateQRCode);
  downloadBtn.addEventListener("click", downloadQRCode);
  qrColor.addEventListener("input", updateColors);
  bgColor.addEventListener("input", updateColors);

  [content, ssid, password, security, hidden].forEach((element) => {
    element.addEventListener("input", invalidatePreview);
    element.addEventListener("change", invalidatePreview);
  });

  security.addEventListener("change", () => {
    password.disabled = security.value === "nopass";

    if (password.disabled) password.value = "";
    invalidatePreview();
  });

  content.addEventListener("keydown", (event) => {
    if (event.ctrlKey && event.key === "Enter") {
      generateQRCode();
    }
  });

  updateColorLabels();
  updateMode();
  password.disabled = security.value === "nopass";
  clearPreview();

  console.log("Velmora QR Studio initialized.");
});
