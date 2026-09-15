import { createFileRoute } from "@tanstack/react-router";
import type { DeviceInfo } from "@/lib/device-bridge";

/**
 * Fase 1: ponto de entrada para descoberta/registro de dispositivos.
 * Ainda não executa ações. O objetivo é estabelecer um contrato estável
 * antes de conectar agentes reais de Windows e Android.
 */
export const Route = createFileRoute("/api/devices")({
  server: {
    handlers: {
      GET: async () => {
        const devices: DeviceInfo[] = [];
        return Response.json({
          protocol: "LUNA-DEVICE/1",
          devices,
          message: "Nenhum agente de dispositivo conectado.",
        });
      },
    },
  },
});
