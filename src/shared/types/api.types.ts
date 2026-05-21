export interface ApiResponse<T> {
  ok: boolean;
  data: T;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  cursor: string | null;
}

export interface ApiError {
  statusCode: number;
  message: string | string[];
  error: string;
}
