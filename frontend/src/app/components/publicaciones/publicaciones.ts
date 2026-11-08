import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth';
import { Publicacion, PublicacionesService } from '../../services/publicaciones';
import { PublicacionComponent } from '../publicacion-componente/publicacion-componente';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-publicaciones',
  standalone: true,
  imports: [DatePipe, FormsModule, RouterLink, PublicacionComponent],
  templateUrl: './publicaciones.html',
  styleUrl: './publicaciones.scss',
})
export class PublicacionesComponent implements OnInit {
  readonly usuarioActual: AuthService['usuarioActual'];
  readonly limite = 8;
  likesEnProceso = new Set<string>();
  publicacionAEliminar: Publicacion | null = null;
  eliminando = false;

  publicaciones: Publicacion[] = [];
  total = 0;
  offset = 0;
  orden: 'fecha' | 'likes' = 'fecha';

  titulo = '';
  descripcion = '';
  imagen: File | null = null;

  cargando = false;
  guardando = false;
  mensajeError = '';
  mensajeExito = '';

  constructor(
    private readonly authService: AuthService,
    private readonly publicacionesService: PublicacionesService,
    private readonly router: Router,
    private readonly cdr: ChangeDetectorRef,
  ) {
    this.usuarioActual = this.authService.usuarioActual;
  }

  ngOnInit(): void {
    this.cargarPublicaciones();
  }

  get paginaActual(): number {
    return Math.floor(this.offset / this.limite) + 1;
  }

  get paginasTotales(): number {
    return Math.max(1, Math.ceil(this.total / this.limite));
  }

  cambiarOrden(orden: 'fecha' | 'likes'): void {
    this.orden = orden;
    this.offset = 0;
    this.cargarPublicaciones();
  }

  cambiarPagina(direccion: -1 | 1): void {
    const nuevoOffset = this.offset + direccion * this.limite;

    if (nuevoOffset < 0 || nuevoOffset >= this.total) {
      return;
    }

    this.offset = nuevoOffset;
    this.cargarPublicaciones();
  }

  seleccionarImagen(event: Event): void {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0] ?? null;

    this.imagen = null;

    if (archivo && !['image/jpeg', 'image/png', 'image/webp'].includes(archivo.type)) {
      this.mensajeError = 'La imagen debe ser JPG, PNG o WEBP.';
      input.value = '';
      return;
    }

    if (archivo && archivo.size > 5 * 1024 * 1024) {
      this.mensajeError = 'La imagen no puede superar los 5 MB.';
      input.value = '';
      return;
    }

    this.mensajeError = '';
    this.imagen = archivo;
  }

  crearPublicacion(): void {
    this.mensajeError = '';
    this.mensajeExito = '';

    if (!this.authService.obtenerUsuario()) {
      void this.router.navigate(['/login']);
      return;
    }

    if (!this.titulo.trim() || !this.descripcion.trim()) {
      this.mensajeError = 'Completá el título y la descripción.';
      return;
    }

    const formulario = new FormData();
    formulario.append('titulo', this.titulo.trim());
    formulario.append('descripcion', this.descripcion.trim());

    if (this.imagen) {
      formulario.append('imagen', this.imagen);
    }

    this.guardando = true;

    this.publicacionesService.crear(formulario).subscribe({
      next: () => {
        this.titulo = '';
        this.descripcion = '';
        this.imagen = null;
        this.offset = 0;
        this.guardando = false;
        this.mensajeExito = 'Publicación creada correctamente.';

        this.cdr.markForCheck();
        this.cargarPublicaciones();
      },
      error: (error: HttpErrorResponse) => {
        this.guardando = false;
        this.mensajeError = this.mensajeDeError(error, 'No se pudo crear la publicación.');
        this.cdr.markForCheck();
      },
    });
  }

  alternarLike(publicacion: Publicacion): void {
    if (this.likesEnProceso.has(publicacion._id)) {
      return;
    }

    this.likesEnProceso.add(publicacion._id);
    this.mensajeError = '';

    this.publicacionesService
      .alternarLike(publicacion)
      .pipe(
        finalize(() => {
          this.likesEnProceso.delete(publicacion._id);
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (resultado) => {
          this.publicaciones = this.publicaciones.map((item) =>
            item._id === publicacion._id
              ? {
                  ...item,
                  likesCount: resultado.likesCount,
                  likedByMe: resultado.likedByMe,
                }
              : item,
          );

          this.cdr.markForCheck();
        },
        error: (error: HttpErrorResponse) => {
          this.mensajeError = this.mensajeDeError(error, 'No se pudo actualizar el me gusta.');

          this.cdr.markForCheck();
        },
      });
  }

  eliminar(publicacion: Publicacion): void {
    this.publicacionAEliminar = publicacion;
  }

  cancelarEliminacion(): void {
    if (this.eliminando) {
      return;
    }

    this.publicacionAEliminar = null;
  }

  confirmarEliminacion(): void {
    if (!this.publicacionAEliminar || this.eliminando) {
      return;
    }

    const id = this.publicacionAEliminar._id;

    this.eliminando = true;
    this.mensajeError = '';

    this.publicacionesService.eliminar(id).subscribe({
      next: () => {
        this.publicacionAEliminar = null;
        this.eliminando = false;
        this.mensajeExito = 'Publicación eliminada correctamente.';

        this.cargarPublicaciones();
        this.cdr.markForCheck();
      },
      error: (error: HttpErrorResponse) => {
        this.eliminando = false;
        this.mensajeError = this.mensajeDeError(error, 'No se pudo eliminar la publicación.');

        this.cdr.markForCheck();
      },
    });
  }

  esPropia(publicacion: Publicacion): boolean {
    return publicacion.usuario?._id === this.authService.obtenerUsuario()?._id;
  }

  puedeEliminar(publicacion: Publicacion): boolean {
    const usuario = this.authService.obtenerUsuario();

    return this.esPropia(publicacion) || usuario?.perfil === 'administrador';
  }

  cerrarSesion(): void {
    this.authService.cerrarSesion();
    void this.router.navigate(['/login']);
  }

  private cargarPublicaciones(): void {
    this.cargando = true;
    this.cdr.markForCheck();

    this.publicacionesService.listar(this.orden, this.offset, this.limite).subscribe({
      next: (pagina) => {
        this.publicaciones = pagina.items;
        this.total = pagina.total;
        this.cargando = false;

        this.cdr.detectChanges();
      },
      error: (error: HttpErrorResponse) => {
        this.cargando = false;

        if (error.status === 401) {
          this.authService.cerrarSesion();
        }

        this.mensajeError = this.mensajeDeError(error, 'No se pudieron cargar las publicaciones.');

        this.cdr.detectChanges();
      },
    });
  }

  private mensajeDeError(error: HttpErrorResponse, fallback: string): string {
    if (error.status === 401) {
      this.authService.cerrarSesion();

      return 'Tu sesión venció. Iniciá sesión nuevamente para continuar.';
    }

    return typeof error.error?.message === 'string' ? error.error.message : fallback;
  }
}
