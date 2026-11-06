import { ChangeDetectorRef, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class LoginComponent {
  identificador = '';
  password = '';

  mensajeError = '';
  mensajeExito = '';
  iniciandoSesion = false;

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly changeDetector: ChangeDetectorRef,
  ) {}

  iniciarSesion(): void {
    this.mensajeError = '';
    this.mensajeExito = '';

    if (this.iniciandoSesion) {
      return;
    }

    if (!this.identificador.trim() || !this.password) {
      this.mensajeError = 'Completá tu usuario o correo y tu contraseña.';
      return;
    }

    if (this.password.length < 8) {
      this.mensajeError = 'La contraseña debe tener al menos 8 caracteres.';
      return;
    }

    this.iniciandoSesion = true;

    this.authService
      .iniciarSesion(this.identificador.trim(), this.password)
      .pipe(
        finalize(() => {
          this.iniciandoSesion = false;
          this.changeDetector.markForCheck();
        }),
      )
      .subscribe({
        next: () => {
          this.mensajeExito = '¡Inicio de sesión exitoso!';
          this.changeDetector.markForCheck();

          setTimeout(() => {
            this.router.navigate(['/mi-perfil']);
          }, 800);
        },
        error: (error: HttpErrorResponse) => {
          if (error.status === 401) {
            this.mensajeError = 'Usuario o contraseña incorrectos.';
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
            this.mensajeError = error.error?.message || 'Ocurrió un error al iniciar sesión.';
          }

          this.changeDetector.markForCheck();
        },
      });
  }
}
