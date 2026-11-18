import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../services/auth';
import {
  ComentarioPublicacion,
  Publicacion,
  PublicacionesService,
} from '../../services/publicaciones';

@Component({
  selector: 'app-publicacion-detalle',
  standalone: true,
  imports: [DatePipe, FormsModule, RouterLink],
  templateUrl: './publicacion-detalle.html',
  styleUrl: './publicacion-detalle.scss',
})
export class PublicacionDetalleComponent implements OnInit {
  readonly usuarioActual: AuthService['usuarioActual'];
  readonly limiteComentarios = 5;

  publicacion: Publicacion | null = null;
  comentarios: ComentarioPublicacion[] = [];
  totalComentarios = 0;
  textoComentario = '';
  comentarioEditandoId: string | null = null;
  textoEdicion = '';
  cargandoPublicacion = true;
  cargandoComentarios = false;
  guardandoComentario = false;
  mensajeError = '';

  private publicacionId = '';

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly authService: AuthService,
    private readonly publicacionesService: PublicacionesService,
    private readonly cdr: ChangeDetectorRef,
  ) {
    this.usuarioActual = this.authService.usuarioActual;
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (!id) {
        void this.router.navigate(['/publicaciones']);
        return;
      }

      this.publicacionId = id;
      this.cargarPublicacion();
    });
  }

  get hayMasComentarios(): boolean {
    return this.comentarios.length < this.totalComentarios;
  }

  cargarMasComentarios(): void {
    this.cargarComentarios(true);
  }

  crearComentario(): void {
    const texto = this.textoComentario.trim();
    if (!this.authService.obtenerUsuario()) {
      void this.router.navigate(['/login']);
      return;
    }
    if (!texto || this.guardandoComentario) {
      return;
    }

    this.guardandoComentario = true;
    this.mensajeError = '';
    this.publicacionesService
      .crearComentario(this.publicacionId, texto)
      .pipe(
        finalize(() => {
          this.guardandoComentario = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (comentario) => {
          this.comentarios = [comentario, ...this.comentarios];
          this.totalComentarios += 1;
          this.textoComentario = '';
          if (this.publicacion) {
            this.publicacion = {
              ...this.publicacion,
              comentariosCount: this.totalComentarios,
            };
          }
          this.cdr.markForCheck();
        },
        error: (error: HttpErrorResponse) => {
          this.mensajeError = this.mensajeDeError(
            error,
            'No se pudo publicar el comentario.',
          );
          this.cdr.markForCheck();
        },
      });
  }

  editarComentario(comentario: ComentarioPublicacion): void {
    this.comentarioEditandoId = comentario._id;
    this.textoEdicion = comentario.texto;
  }

  cancelarEdicion(): void {
    this.comentarioEditandoId = null;
    this.textoEdicion = '';
  }

  guardarEdicion(comentario: ComentarioPublicacion): void {
    const texto = this.textoEdicion.trim();
    if (!texto || this.guardandoComentario) {
      return;
    }

    this.guardandoComentario = true;
    this.mensajeError = '';
    this.publicacionesService
      .actualizarComentario(this.publicacionId, comentario._id, texto)
      .pipe(
        finalize(() => {
          this.guardandoComentario = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (actualizado) => {
          this.comentarios = this.comentarios.map((item) =>
            item._id === actualizado._id ? actualizado : item,
          );
          this.cancelarEdicion();
          this.cdr.markForCheck();
        },
        error: (error: HttpErrorResponse) => {
          this.mensajeError = this.mensajeDeError(
            error,
            'No se pudo modificar el comentario.',
          );
          this.cdr.markForCheck();
        },
      });
  }

  esPropio(comentario: ComentarioPublicacion): boolean {
    return comentario.usuario === this.authService.obtenerUsuario()?._id;
  }

  private cargarPublicacion(): void {
    this.cargandoPublicacion = true;
    this.mensajeError = '';
    this.publicacionesService.obtener(this.publicacionId).subscribe({
      next: (publicacion) => {
        this.publicacion = publicacion;
        this.cargandoPublicacion = false;
        this.cargarComentarios();
        this.cdr.markForCheck();
      },
      error: (error: HttpErrorResponse) => {
        this.cargandoPublicacion = false;
        this.mensajeError = this.mensajeDeError(
          error,
          'No se pudo cargar la publicación.',
        );
        this.cdr.markForCheck();
      },
    });
  }

  private cargarComentarios(append = false): void {
    if (this.cargandoComentarios) {
      return;
    }

    this.cargandoComentarios = true;
    const offset = append ? this.comentarios.length : 0;
    this.publicacionesService
      .listarComentarios(
        this.publicacionId,
        offset,
        this.limiteComentarios,
      )
      .pipe(
        finalize(() => {
          this.cargandoComentarios = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (pagina) => {
          this.comentarios = append
            ? [...this.comentarios, ...pagina.items]
            : pagina.items;
          this.totalComentarios = pagina.total;
          if (this.publicacion) {
            this.publicacion = {
              ...this.publicacion,
              comentariosCount: pagina.total,
            };
          }
          this.cdr.markForCheck();
        },
        error: (error: HttpErrorResponse) => {
          this.mensajeError = this.mensajeDeError(
            error,
            'No se pudieron cargar los comentarios.',
          );
          this.cdr.markForCheck();
        },
      });
  }

  private mensajeDeError(error: HttpErrorResponse, fallback: string): string {
    return typeof error.error?.message === 'string'
      ? error.error.message
      : fallback;
  }
}
