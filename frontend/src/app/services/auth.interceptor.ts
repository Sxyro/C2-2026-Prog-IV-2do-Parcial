import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const token = authService.obtenerToken();

  // Si existe un token, lo enviamos al backend.
  const requestAutenticada = token
    ? request.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`,
        },
      })
    : request;

  return next(requestAutenticada).pipe(
    catchError((error: unknown) => {
      const esInicioDeSesion = request.url.endsWith('/login') || request.url.endsWith('/register');

      if (error instanceof HttpErrorResponse && error.status === 401 && !esInicioDeSesion) {
        authService.cerrarSesion();
        void router.navigate(['/login']);
      }

      return throwError(() => error);
    }),
  );
};
