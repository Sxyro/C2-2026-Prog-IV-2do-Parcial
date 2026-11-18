import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth';
import { Publicacion, PublicacionesService } from '../../services/publicaciones';

@Component({
  selector: 'app-mi-perfil',
  standalone: true,
  imports: [DatePipe, RouterLink, FormsModule],
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

  datosEdicion = {
    nombre: '',
    apellido: '',
    username: '',
    email: '',
    fechaNacimiento: '',
    descripcion: '',
  };

  publicaciones: Publicacion[] = [];
  totalPublicaciones = 0;
  mensajeError = '';
  cargandoPublicaciones = false;

  mostrarModalEdicion = false;
  mostrarModalResultado = false;
  guardandoCambios = false;
  mensajeResultado = '';
  errorEdicion = '';

  imagenSeleccionada?: File;
  imagenPreview = '';

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

    this.actualizarDatosVisuales(usuarioActual);

    this.cargarPublicaciones(usuarioActual._id);
  }

  cerrarSesion(): void {
    this.authService.cerrarSesion();
    void this.router.navigate(['/login']);
  }

  abrirEdicion(): void {
    const usuarioActual = this.authService.obtenerUsuario();

    if (!usuarioActual) {
      void this.router.navigate(['/login']);
      return;
    }

    this.datosEdicion = {
      nombre: usuarioActual.nombre,
      apellido: usuarioActual.apellido,
      username: usuarioActual.username,
      email: usuarioActual.email,
      fechaNacimiento: usuarioActual.fechaNacimiento
        ? usuarioActual.fechaNacimiento.substring(0, 10)
        : '',
      descripcion: usuarioActual.descripcion || '',
    };

    this.imagenSeleccionada = undefined;
    this.imagenPreview = '';
    this.errorEdicion = '';
    this.mostrarModalEdicion = true;
  }

  cerrarEdicion(): void {
    if (this.guardandoCambios) {
      return;
    }

    this.mostrarModalEdicion = false;
    this.errorEdicion = '';
    this.limpiarImagenPreview();
  }

  seleccionarImagen(event: Event): void {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0];

    if (!archivo) {
      return;
    }

    const tiposPermitidos = ['image/jpeg', 'image/png', 'image/webp'];

    if (!tiposPermitidos.includes(archivo.type)) {
      this.errorEdicion = 'La imagen debe ser JPG, PNG o WEBP.';
      input.value = '';
      return;
    }

    if (archivo.size > 5 * 1024 * 1024) {
      this.errorEdicion = 'La imagen no puede superar los 5 MB.';
      input.value = '';
      return;
    }

    this.limpiarImagenPreview();

    this.imagenSeleccionada = archivo;
    this.imagenPreview = URL.createObjectURL(archivo);
    this.errorEdicion = '';
  }

  guardarCambios(): void {
    if (this.guardandoCambios) {
      return;
    }

    this.errorEdicion = '';

    const formulario = new FormData();

    formulario.append('nombre', this.datosEdicion.nombre.trim());
    formulario.append('apellido', this.datosEdicion.apellido.trim());
    formulario.append('username', this.datosEdicion.username.trim());
    formulario.append('email', this.datosEdicion.email.trim());
    formulario.append('fechaNacimiento', this.datosEdicion.fechaNacimiento);
    formulario.append('descripcion', this.datosEdicion.descripcion.trim());

    if (this.imagenSeleccionada) {
      formulario.append('imagenPerfil', this.imagenSeleccionada);
    }

    this.guardandoCambios = true;

    this.authService.actualizarPerfil(formulario).subscribe({
      next: (usuarioActualizado) => {
        this.actualizarDatosVisuales(usuarioActualizado);

        this.guardandoCambios = false;
        this.mostrarModalEdicion = false;
        this.mostrarModalResultado = true;
        this.mensajeResultado = 'Tu perfil se actualizó correctamente.';

        this.limpiarImagenPreview();
        this.cdr.markForCheck();
      },
      error: (error: HttpErrorResponse) => {
        this.guardandoCambios = false;

        if (typeof error.error?.message === 'string') {
          this.errorEdicion = error.error.message;
        } else if (Array.isArray(error.error?.message)) {
          this.errorEdicion = error.error.message.join(' ');
        } else if (error.status === 409) {
          this.errorEdicion = 'El email o nombre de usuario ya está registrado.';
        } else if (error.status === 401) {
          this.errorEdicion = 'Tu sesión expiró. Iniciá sesión nuevamente.';
        } else {
          this.errorEdicion = 'No se pudieron guardar los cambios. Intentá nuevamente.';
        }

        this.cdr.markForCheck();
      },
    });
  }

  cerrarModalResultado(): void {
    this.mostrarModalResultado = false;
  }

  private actualizarDatosVisuales(usuario: {
    nombre: string;
    apellido: string;
    username: string;
    email: string;
    fechaNacimiento: string;
    descripcion: string;
    imagenPerfil: string;
    perfil: string;
  }): void {
    this.usuario = {
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      username: usuario.username,
      email: usuario.email,
      fechaNacimiento: this.formatearFecha(usuario.fechaNacimiento),
      descripcion: usuario.descripcion || 'Sin descripción.',
      imagenPerfil: usuario.imagenPerfil || '',
      perfil: usuario.perfil === 'administrador' ? 'Administrador' : 'Usuario',
      iniciales: (usuario.nombre.charAt(0) + usuario.apellido.charAt(0)).toUpperCase(),
    };
  }

  private formatearFecha(fecha: string): string {
    if (!fecha) {
      return 'No disponible';
    }

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

  private limpiarImagenPreview(): void {
    if (this.imagenPreview) {
      URL.revokeObjectURL(this.imagenPreview);
    }

    this.imagenPreview = '';
    this.imagenSeleccionada = undefined;
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
