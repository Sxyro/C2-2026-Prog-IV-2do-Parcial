import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from './services/auth';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  cargando = true;
  extendiendoSesion = false;
  mensajeErrorValidacion = '';
  mensajeErrorExtension = '';

  constructor(
    readonly authService: AuthService,
    private readonly router: Router,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    if (!this.authService.obtenerToken()) {
      this.cargando = false;
      void this.router.navigate(['/login']);
      return;
    }

    this.validarSesion();
  }

  validarSesion(): void {
    this.cargando = true;
    this.mensajeErrorValidacion = '';

    this.authService
      .autorizar()
      .pipe(
        finalize(() => {
          this.cargando = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: () =>
          void this.router.navigate(
            this.authService.obtenerToken()
              ? ['/publicaciones']
              : ['/login'],
          ),
        error: (error: HttpErrorResponse) => {
          if (error.status === 401) {
            this.authService.cerrarSesion();
            void this.router.navigate(['/login']);
          } else {
            this.mensajeErrorValidacion =
              'No se pudo validar la sesión. Revisá la conexión e intentá nuevamente.';
          }
          this.cdr.markForCheck();
        },
      });
  }

  extenderSesion(): void {
    if (this.extendiendoSesion) {
      return;
    }

    this.extendiendoSesion = true;
    this.authService
      .refrescar()
      .pipe(
        finalize(() => {
          this.extendiendoSesion = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: () => {
          this.mensajeErrorExtension = '';
          this.authService.cerrarAdvertenciaSesion();
        },
        error: (error: HttpErrorResponse) => {
          if (error.status !== 401) {
            this.mensajeErrorExtension =
              'No se pudo extender la sesión. Intentá nuevamente.';
          }
          this.cdr.markForCheck();
        },
      });
  }

  continuarSinExtender(): void {
    this.authService.cerrarAdvertenciaSesion();
  }
}
