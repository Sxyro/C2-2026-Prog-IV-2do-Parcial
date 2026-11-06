import { Injectable, computed, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
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
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly apiUrl = environment.apiUrl;
  private readonly claveUsuario = 'mannboard_usuario';

  private readonly usuarioSignal = signal<UsuarioAutenticado | null>(this.leerUsuarioGuardado());

  readonly usuarioActual = this.usuarioSignal.asReadonly();
  readonly estaAutenticado = computed(() => this.usuarioSignal() !== null);

  constructor(private readonly http: HttpClient) {}

  iniciarSesion(identificador: string, password: string): Observable<UsuarioAutenticado> {
    return this.http
      .post<UsuarioAutenticado>(`${this.apiUrl}/login`, {
        identificador,
        password,
      })
      .pipe(
        tap((usuario) => {
          localStorage.setItem(this.claveUsuario, JSON.stringify(usuario));
          this.usuarioSignal.set(usuario);
        }),
      );
  }

  obtenerUsuario(): UsuarioAutenticado | null {
    return this.usuarioSignal();
  }

  cerrarSesion(): void {
    localStorage.removeItem(this.claveUsuario);
    this.usuarioSignal.set(null);
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
      return JSON.parse(usuarioGuardado) as UsuarioAutenticado;
    } catch {
      localStorage.removeItem(this.claveUsuario);
      return null;
    }
  }
}
