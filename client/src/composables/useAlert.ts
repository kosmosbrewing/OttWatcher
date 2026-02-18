import { readonly, reactive } from "vue";

type AlertType = "success" | "error" | "warning" | "info";
type ConfirmVariant = "success" | "destructive";
type AlertMode = "alert" | "confirm";

type AlertState = {
  isOpen: boolean;
  mode: AlertMode;
  message: string;
  type: AlertType;
  duration: number;
  confirmVariant: ConfirmVariant;
  confirmText: string;
  cancelText: string;
  resolver: ((value: boolean) => void) | null;
};

const state = reactive<AlertState>({
  isOpen: false,
  mode: "alert",
  message: "",
  type: "success",
  duration: 2200,
  confirmVariant: "success",
  confirmText: "확인",
  cancelText: "취소",
  resolver: null,
});

function settlePendingConfirm(value: boolean): void {
  if (!state.resolver) return;
  const resolve = state.resolver;
  state.resolver = null;
  resolve(value);
}

function resetAlertState(): void {
  state.isOpen = false;
  state.message = "";
  state.mode = "alert";
}

function closeAlert(): void {
  settlePendingConfirm(false);
  resetAlertState();
}

export function showAlert(
  message: string,
  options?: { type?: AlertType; duration?: number }
): void {
  settlePendingConfirm(false);
  state.mode = "alert";
  state.message = message;
  state.type = options?.type || "success";
  state.duration = options?.duration ?? 2200;
  state.isOpen = true;
}

export function showConfirm(
  message: string,
  options?: {
    confirmVariant?: ConfirmVariant;
    confirmText?: string;
    cancelText?: string;
  }
): Promise<boolean> {
  settlePendingConfirm(false);
  state.mode = "confirm";
  state.message = message;
  state.confirmVariant = options?.confirmVariant || "success";
  state.confirmText = options?.confirmText || "확인";
  state.cancelText = options?.cancelText || "취소";
  state.isOpen = true;

  return new Promise<boolean>((resolve) => {
    state.resolver = resolve;
  });
}

export function showDestructiveConfirm(
  message: string,
  options?: {
    confirmText?: string;
    cancelText?: string;
  }
): Promise<boolean> {
  return showConfirm(message, {
    confirmVariant: "destructive",
    confirmText: options?.confirmText,
    cancelText: options?.cancelText,
  });
}

export function confirmAlert(): void {
  settlePendingConfirm(true);
  resetAlertState();
}

export function cancelAlert(): void {
  closeAlert();
}

export function useAlert() {
  return {
    alertState: readonly(state),
    showAlert,
    showConfirm,
    showDestructiveConfirm,
    closeAlert,
    confirmAlert,
    cancelAlert,
  };
}
