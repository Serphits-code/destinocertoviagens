import type { NextConfig } from "next";
import os from "os";

// Detecta automaticamente todos os endereços IPv4 da máquina atual
const detectedLocalIps = Object.values(os.networkInterfaces())
  .flat()
  .filter((iface): iface is os.NetworkInterfaceInfo => Boolean(iface && iface.family === "IPv4"))
  .map((iface) => iface.address);

const nextConfig: NextConfig = {
  // Permite acesso de qualquer IP ou dispositivo na rede local sem bloquear scripts e HMR
  allowedDevOrigins: [
    "localhost",
    "127.0.0.1",
    "*.*.*.*",        // Permite qualquer IPv4 (evita bloqueio quando o roteador muda de IP)
    "192.168.*.*",    // Redes locais padrão
    "10.*.*.*",       // Redes locais corporativas/roteadores
    "172.*.*.*",      // Redes locais 172.16-31
    "**.local",       // Permite acessar pelo nome da máquina (ex: desktop.local)
    ...detectedLocalIps,
  ],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(self)",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
