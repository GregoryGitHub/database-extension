import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

export function validateConnectionForm(data: any): string[] {
  const errors: string[] = [];
  
  if (!data.name?.trim()) {
    errors.push('Connection name is required');
  }
  
  if (!data.host?.trim()) {
    errors.push('Host is required');
  }
  
  if (!data.port || data.port < 1 || data.port > 65535) {
    errors.push('Port must be between 1 and 65535');
  }
  
  if (!data.database?.trim()) {
    errors.push('Database name is required');
  }
  
  if (!data.username?.trim()) {
    errors.push('Username is required');
  }
  
  return errors;
}
