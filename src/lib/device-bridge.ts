export type DeviceKind = "pc" | "android";
export type DeviceStatus = "offline" | "connecting" | "online" | "error";

export type DeviceAction =
  | "observe"
  | "open_app"
  | "open_url"
  | "click"
  | "type"
  | "key"
  | "back"
  | "home";

export interface DeviceCommand {
  id: string;
  device: DeviceKind;
  action: DeviceAction;
  target?: string;
  value?: string;
  x?: number;
  y?: number;
  arguments?: string[];
}

export interface DeviceResult {
  id: string;
  ok: boolean;
  message: string;
  state?: Record<string, unknown>;
}

export interface DeviceInfo {
  id: string;
  name: string;
  kind: DeviceKind;
  status: DeviceStatus;
  capabilities: DeviceAction[];
  lastSeen?: string;
}

/**
 * Contrato central da Fase 1.
 * Nesta fase não executa comandos no dispositivo: apenas define o protocolo
 * que o agente Windows e o aplicativo Android implementarão posteriormente.
 */
export const DEVICE_PROTOCOL_VERSION = "LUNA-DEVICE/1" as const;

export function createCommand(
  device: DeviceKind,
  action: DeviceAction,
  input: Omit<DeviceCommand, "id" | "device" | "action"> = {},
): DeviceCommand {
  return {
    id: crypto.randomUUID(),
    device,
    action,
    ...input,
  };
}
