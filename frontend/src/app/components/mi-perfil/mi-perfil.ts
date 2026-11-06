import { Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth';

interface PublicacionPerfil {
  id: number;
  categoria: string;
  titulo: string;
  contenido: string;
  tiempo: string;
  likes: number;
  comentarios: number;
}

@Component({
  selector: 'app-mi-perfil',
  standalone: true,
  imports: [RouterLink],
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
    equipo: 'RED' as 'RED' | 'BLU',
    perfil: 'Usuario',
    iniciales: '',
  };

  publicaciones: PublicacionPerfil[] = [
    {
      id: 1,
      categoria: 'TEAM FORTRESS 2',
      titulo: 'Mi clase favorita sigue siendo el Scout',
      contenido:
        'No importa cuántas horas juegue, siempre termino volviendo al Scout. La movilidad y el ritmo de juego son incomparables.',
      tiempo: 'Hace 2 horas',
      likes: 42,
      comentarios: 12,
    },
    {
      id: 2,
      categoria: 'HARDWARE Y VIDEOJUEGOS',
      titulo: 'Actualización de mi espacio de juego',
      contenido:
        'Finalmente pude organizar todo mi setup. Ahora tengo mucho más espacio para jugar y trabajar cómodamente.',
      tiempo: 'Ayer',
      likes: 28,
      comentarios: 7,
    },
    {
      id: 3,
      categoria: 'COMUNIDAD',
      titulo: '¿Qué juegos están jugando últimamente?',
      contenido:
        'Estoy buscando recomendaciones para probar algo nuevo. ¿Qué juegos les están dando más horas de diversión?',
      tiempo: 'Hace 3 días',
      likes: 19,
      comentarios: 5,
    },
  ];

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
  ) {
    this.usuarioActual = this.authService.usuarioActual;
  }

  ngOnInit(): void {
    const usuarioActual = this.authService.obtenerUsuario();

    if (!usuarioActual) {
      this.router.navigate(['/login']);
      return;
    }

    this.usuario = {
      nombre: usuarioActual.nombre,
      apellido: usuarioActual.apellido,
      username: usuarioActual.username,
      email: usuarioActual.email,
      fechaNacimiento: new Date(usuarioActual.fechaNacimiento).toISOString().slice(0, 10).split('-').reverse().join('/'),
      descripcion: usuarioActual.descripcion || 'Sin descripción.',
      imagenPerfil: usuarioActual.imagenPerfil || '',
      equipo: 'RED',
      perfil: usuarioActual.perfil === 'administrador' ? 'Administrador' : 'Usuario',
      iniciales: (usuarioActual.nombre.charAt(0) + usuarioActual.apellido.charAt(0)).toUpperCase(),
    };
  }

  cerrarSesion(): void {
    this.authService.cerrarSesion();
    this.router.navigate(['/']);
  }
}
