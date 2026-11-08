import { Component, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-registro',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './registro.html',
  styleUrl: './registro.scss',
})
export class RegistroComponent {
  nombre = '';
  apellido = '';
  email = '';
  username = '';
  password = '';
  repetirPassword = '';
  fechaNacimiento = '';
  descripcion = '';
  imagenPerfil: File | null = null;

  mensajeError = '';
  mensajeExito = '';
  registrando = false;

  private readonly apiUrl = `${environment.apiUrl}/register`;

  constructor(
    private readonly http: HttpClient,
    private readonly router: Router,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  seleccionarImagen(event: Event): void {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0] ?? null;

    this.imagenPerfil = null;
    this.mensajeError = '';

    if (!archivo) return;

    const formatosPermitidos = ['image/jpeg', 'image/png', 'image/webp'];

    if (!formatosPermitidos.includes(archivo.type)) {
      this.mensajeError = 'La imagen debe ser JPG, PNG o WEBP.';
      input.value = '';
      return;
    }

    if (archivo.size > 5 * 1024 * 1024) {
      this.mensajeError = 'La imagen no puede superar los 5 MB.';
      input.value = '';
      return;
    }

    this.imagenPerfil = archivo;
  }

  registrar(): void {
    this.mensajeError = '';
    this.mensajeExito = '';

    if (this.registrando) return;

    if (this.password !== this.repetirPassword) {
      this.mensajeError = 'Las contraseñas no coinciden.';
      return;
    }

    if (this.password.length < 8 || !/[A-Z]/.test(this.password) || !/\d/.test(this.password)) {
      this.mensajeError = 'La contraseña necesita 8 caracteres, una mayúscula y un número.';
      return;
    }

    if (!this.fechaNacimiento) {
      this.mensajeError = 'Ingresá tu fecha de nacimiento.';
      return;
    }

    if (new Date(this.fechaNacimiento) > new Date()) {
      this.mensajeError = 'La fecha de nacimiento no puede ser futura.';
      return;
    }

    const formulario = new FormData();

    formulario.append('nombre', this.nombre.trim());
    formulario.append('apellido', this.apellido.trim());
    formulario.append('email', this.email.trim());
    formulario.append('username', this.username.trim());
    formulario.append('password', this.password);
    formulario.append('fechaNacimiento', this.fechaNacimiento);
    formulario.append('descripcion', this.descripcion.trim());

    if (this.imagenPerfil) {
      formulario.append('imagenPerfil', this.imagenPerfil);
    }

    this.registrando = true;

    this.http.post(this.apiUrl, formulario).subscribe({
      next: () => {
        this.registrando = false;
        this.mensajeExito = '¡Tu cuenta fue creada correctamente!';
        this.cdr.detectChanges();

        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 1800);
      },

      error: (error: HttpErrorResponse) => {
        this.registrando = false;

        if (error.status === 409) {
          this.mensajeError =
            typeof error.error?.message === 'string'
              ? error.error.message
              : 'El correo o nombre de usuario ya está registrado.';
        } else if (error.status === 400) {
          const mensajes = error.error?.message;

          this.mensajeError = Array.isArray(mensajes)
            ? mensajes.join(' ')
            : typeof mensajes === 'string'
              ? mensajes
              : 'Revisá los datos ingresados.';
        } else if (error.status === 0) {
          this.mensajeError =
            'No se pudo conectar con el servidor. Verificá que el backend esté funcionando.';
        } else {
          this.mensajeError = error.error?.message || 'Ocurrió un error al crear tu cuenta.';
        }

        this.cdr.detectChanges();
      },
    });
  }
}
