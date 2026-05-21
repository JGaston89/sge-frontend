export interface LoginDto {
  email: string;
  password: string;
  institucion_id: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface LoginResponse extends AuthTokens {
  usuario: {
    id: string;
    nombre: string;
    apellido: string;
    email: string;
    roles: string[];
    primer_acceso: boolean;
    totp_activo: boolean;
  };
}

export interface UserSession {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  institucion_id: string;
  roles: string[];
  primer_acceso: boolean;
}
