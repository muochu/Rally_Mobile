type ToastVariant = 'success' | 'error' | 'info';

type ToastMessage = {
  id: number;
  message: string;
  variant: ToastVariant;
};

type Listener = (toasts: ToastMessage[]) => void;

let toasts: ToastMessage[] = [];
let nextId = 0;
const listeners = new Set<Listener>();

const notify = (): void => {
  listeners.forEach((l) => l([...toasts]));
};

export const toast = {
  show(message: string, variant: ToastVariant = 'info'): void {
    const id = nextId++;
    toasts = [...toasts, { id, message, variant }];
    notify();
    setTimeout(() => {
      toasts = toasts.filter((t) => t.id !== id);
      notify();
    }, 3200);
  },
  success(message: string): void {
    this.show(message, 'success');
  },
  error(message: string): void {
    this.show(message, 'error');
  },
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

export type { ToastMessage, ToastVariant };
