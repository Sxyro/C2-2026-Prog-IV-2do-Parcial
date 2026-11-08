import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth';
import { Publicacion, PublicacionesService } from '../../services/publicaciones';

@Component({
  selector: 'app-mi-perfil',
  standalone: true,
  imports: [DatePipe, RouterLink],
  templateUrl: './mi-perfil.html',
  styleUrl: './mi-perfil.scss',
})
export class MiPerfilComponent implements OnInit {
  readonly usuarioActual: AuthService['usuarioActual'];

  usuario = {
    nombre: '',
    apellido: '',
    username: '',
    email: '',
    fechaNacimiento: '',
    descripcion: '',
    imagenPerfil: '',
    perfil: 'Usuario',
    iniciales: '',
  };

  publicaciones: Publicacion[] = [];
  totalPublicaciones = 0;
  mensajeError = '';
  cargandoPublicaciones = false;

  constructor(
    private readonly authService: AuthService,
    private readonly publicacionesService: PublicacionesService,
    private readonly router: Router,
    private readonly cdr: ChangeDetectorRef,
  ) {
    this.usuarioActual = this.authService.usuarioActual;
  }

  ngOnInit(): void {
    const usuarioActual = this.authService.obtenerUsuario();

    if (!usuarioActual) {
      void this.router.navigate(['/login']);
      return;
    }

    this.usuario = {
      nombre: usuarioActual.nombre,
      apellido: usuarioActual.apellido,
      username: usuarioActual.username,
      email: usuarioActual.email,
      fechaNacimiento: this.formatearFecha(usuarioActual.fechaNacimiento),
      descripcion: usuarioActual.descripcion || 'Sin descripción.',
      imagenPerfil: usuarioActual.imagenPerfil || '',
      perfil: usuarioActual.perfil === 'administrador' ? 'Administrador' : 'Usuario',
      iniciales: (usuarioActual.nombre.charAt(0) + usuarioActual.apellido.charAt(0)).toUpperCase(),
    };

    this.cargarPublicaciones(usuarioActual._id);
  }

  cerrarSesion(): void {
    this.authService.cerrarSesion();
    void this.router.navigate(['/login']);
  }

  private formatearFecha(fecha: string): string {
    if (!fecha) {
      return 'No disponible';
    }

    // Tomamos directamente año, mes y día para evitar el cambio
    // de fecha que puede producir la conversión UTC/local.
    const fechaParte = fecha.substring(0, 10);
    const partes = fechaParte.split('-');

    if (partes.length !== 3) {
      return 'No disponible';
    }

    const [anio, mes, dia] = partes;

    if (!anio || !mes || !dia) {
      return 'No disponible';
    }

    return `${dia}/${mes}/${anio}`;
  }

  private cargarPublicaciones(usuarioId: string): void {
    this.cargandoPublicaciones = true;
    this.cdr.markForCheck();

    this.publicacionesService.listar('fecha', 0, 3, usuarioId).subscribe({
      next: (pagina) => {
        this.publicaciones = pagina.items;
        this.totalPublicaciones = pagina.total;
        this.cargandoPublicaciones = false;

        this.cdr.markForCheck();
      },
      error: (error: HttpErrorResponse) => {
        this.cargandoPublicaciones = false;
        this.mensajeError =
          typeof error.error?.message === 'string'
            ? error.error.message
            : 'No se pudieron cargar tus publicaciones.';

        this.cdr.markForCheck();
      },
    });
  }
}
