import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth';

export interface UsuarioPublicacion {
  _id: string;
  nombre: string;
  apellido: string;
  username: string;
  imagenPerfil: string;
}

export interface ComentarioPublicacion {
  _id?: string;
  username: string;
  texto: string;
  createdAt: string;
}

export interface Publicacion {
  _id: string;
  titulo: string;
  descripcion: string;
  imagen: string;
  usuario: UsuarioPublicacion;
  likesCount: number;
  likedByMe: boolean;
  comentarios: ComentarioPublicacion[];
  createdAt: string;
}

export interface PaginaPublicaciones {
  items: Publicacion[];
  total: number;
  offset: number;
  limit: number;
}

@Injectable({ providedIn: 'root' })
export class PublicacionesService {
  private readonly apiUrl = `${environment.apiBaseUrl}/publicaciones`;

  constructor(
    private readonly http: HttpClient,
    private readonly authService: AuthService,
  ) {}

  listar(
    orden: 'fecha' | 'likes',
    offset: number,
    limit: number,
    usuarioId?: string,
  ): Observable<PaginaPublicaciones> {
    let params = new HttpParams()
      .set('orden', orden)
      .set('offset', offset)
      .set('limit', limit);

    if (usuarioId) {
      params = params.set('usuarioId', usuarioId);
    }

    return this.http.get<PaginaPublicaciones>(this.apiUrl, {
      params,
      headers: this.headers(false),
    });
  }

  crear(formulario: FormData): Observable<Publicacion> {
    return this.http.post<Publicacion>(this.apiUrl, formulario, {
      headers: this.headers(),
    });
  }

  eliminar(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, {
      headers: this.headers(),
    });
  }

  alternarLike(publicacion: Publicacion): Observable<{ likesCount: number; likedByMe: boolean }> {
    const request = publicacion.likedByMe
      ? this.http.delete<{ likesCount: number; likedByMe: boolean }>(
          `${this.apiUrl}/${publicacion._id}/likes`,
          { headers: this.headers() },
        )
      : this.http.post<{ likesCount: number; likedByMe: boolean }>(
          `${this.apiUrl}/${publicacion._id}/likes`,
          {},
          { headers: this.headers() },
        );

    return request;
  }

  private headers(requerido = true): HttpHeaders {
    const token = this.authService.obtenerToken();

    if (requerido && !token) {
      throw new Error('La sesión no tiene un token válido. Iniciá sesión nuevamente.');
    }

    return token
      ? new HttpHeaders({ Authorization: `Bearer ${token}` })
      : new HttpHeaders();
  }
}
