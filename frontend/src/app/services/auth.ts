import { Injectable, computed, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, map } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';

export interface UsuarioAutenticado {
  _id: string;
  nombre: string;
  apellido: string;
  email: string;
  username: string;
  fechaNacimiento: string;
  descripcion: string;
  imagenPerfil: string;
  perfil: 'usuario' | 'administrador';
  accessToken?: string;
}

interface TokenResponse {
  accessToken: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly apiUrl = environment.apiUrl;
  private readonly claveUsuario = 'mannboard_usuario';

  private readonly usuarioSignal = signal<UsuarioAutenticado | null>(this.leerUsuarioGuardado());

  private readonly advertenciaSesionSignal = signal(false);

  private advertenciaTimeout?: ReturnType<typeof setTimeout>;
  private expiracionTimeout?: ReturnType<typeof setTimeout>;

  readonly usuarioActual = this.usuarioSignal.asReadonly();

  readonly estaAutenticado = computed(() => this.usuarioSignal() !== null);

  readonly mostrarAdvertenciaSesion = this.advertenciaSesionSignal.asReadonly();

  constructor(
    private readonly http: HttpClient,
    private readonly router: Router,
  ) {}

  iniciarSesion(identificador: string, password: string): Observable<UsuarioAutenticado> {
    return this.http
      .post<UsuarioAutenticado>(`${this.apiUrl}/login`, {
        identificador,
        password,
      })
      .pipe(tap((usuario) => this.guardarUsuario(usuario)));
  }

  registrar(formulario: FormData): Observable<UsuarioAutenticado> {
    return this.http
      .post<UsuarioAutenticado>(`${this.apiUrl}/register`, formulario)
      .pipe(tap((usuario) => this.guardarUsuario(usuario)));
  }

  actualizarPerfil(formulario: FormData): Observable<UsuarioAutenticado> {
    return this.http
      .put<Omit<UsuarioAutenticado, 'accessToken'>>(`${this.apiUrl}/perfil`, formulario)
      .pipe(
        map((usuario) => ({
          ...usuario,
          accessToken: this.obtenerToken() ?? undefined,
        })),
        tap((usuario) => this.guardarUsuario(usuario)),
      );
  }

  autorizar(): Observable<UsuarioAutenticado> {
    const token = this.obtenerToken();

    if (!token) {
      throw new Error('No hay un token para validar.');
    }

    return this.http.post<UsuarioAutenticado>(`${this.apiUrl}/authorize`, { token }).pipe(
      tap((usuario) =>
        this.guardarUsuario({
          ...usuario,
          accessToken: token,
        }),
      ),
    );
  }

  refrescar(): Observable<TokenResponse> {
    const token = this.obtenerToken();

    if (!token) {
      throw new Error('No hay un token para refrescar.');
    }

    return this.http.post<TokenResponse>(`${this.apiUrl}/refresh`, { token }).pipe(
      tap(({ accessToken }) => {
        const usuario = this.usuarioSignal();

        if (usuario) {
          this.guardarUsuario({
            ...usuario,
            accessToken,
          });
        }
      }),
    );
  }

  obtenerUsuario(): UsuarioAutenticado | null {
    return this.usuarioSignal();
  }

  obtenerToken(): string | null {
    return this.usuarioSignal()?.accessToken ?? null;
  }

  cerrarSesion(): void {
    this.limpiarTemporizadores();

    localStorage.removeItem(this.claveUsuario);

    this.usuarioSignal.set(null);
    this.advertenciaSesionSignal.set(false);
  }

  cerrarAdvertenciaSesion(): void {
    this.advertenciaSesionSignal.set(false);
  }

  private guardarUsuario(usuario: UsuarioAutenticado): void {
    localStorage.setItem(this.claveUsuario, JSON.stringify(usuario));

    this.usuarioSignal.set(usuario);

    this.iniciarTemporizadores(usuario.accessToken);
  }

  private iniciarTemporizadores(token?: string): void {
    this.limpiarTemporizadores();

    if (!token) {
      return;
    }

    const payload = token.split('.')[1];

    if (!payload) {
      throw new Error('El token recibido no tiene un payload válido.');
    }

    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');

    const decoded = JSON.parse(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='))) as {
      exp?: unknown;
    };

    if (typeof decoded.exp !== 'number') {
      throw new Error('El token recibido no contiene una fecha de expiración.');
    }

    const tiempoRestante = decoded.exp * 1000 - Date.now();

    if (tiempoRestante <= 0) {
      this.cerrarSesion();
      void this.router.navigate(['/login']);
      return;
    }

    this.advertenciaTimeout = setTimeout(
      () => this.advertenciaSesionSignal.set(true),
      Math.max(0, tiempoRestante - 2 * 60 * 1000),
    );

    this.expiracionTimeout = setTimeout(() => {
      this.cerrarSesion();
      void this.router.navigate(['/login']);
    }, tiempoRestante);
  }

  private limpiarTemporizadores(): void {
    if (this.advertenciaTimeout) {
      clearTimeout(this.advertenciaTimeout);
      this.advertenciaTimeout = undefined;
    }

    if (this.expiracionTimeout) {
      clearTimeout(this.expiracionTimeout);
      this.expiracionTimeout = undefined;
    }
  }

  private leerUsuarioGuardado(): UsuarioAutenticado | null {
    if (typeof localStorage === 'undefined') {
      return null;
    }

    const usuarioGuardado = localStorage.getItem(this.claveUsuario);

    if (!usuarioGuardado) {
      return null;
    }

    try {
      const usuario = JSON.parse(usuarioGuardado) as UsuarioAutenticado;

      if (!usuario.accessToken) {
        localStorage.removeItem(this.claveUsuario);
        return null;
      }

      return usuario;
    } catch {
      localStorage.removeItem(this.claveUsuario);
      return null;
    }
  }
}
