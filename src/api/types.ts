export interface ApiSuccess {
  status: true;
  code: number;
  message: string;
}

export interface ApiError {
  status: false;
  code: number;
  message: string;
}

export interface ApiResponse<T = null> {
  success: ApiSuccess | null;
  data: T | null;
  error: ApiError | null;
}
