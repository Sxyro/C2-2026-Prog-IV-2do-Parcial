import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth';

interface Publicacion {
  id: number;
  usuario: string;
  alias: string;
  iniciales: string;
  equipo: 'RED' | 'BLU';
  tiempo: string;
  categoria: string;
  titulo: string;
  contenido: string;
  likes: number;
  comentarios: number;
  liked: boolean;
}

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './inicio.html',
  styleUrl: './inicio.scss',
})
export class InicioComponent {
  readonly usuarioActual;

  equipoActual: 'RED' | 'BLU' = 'RED';

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
  ) {
    this.usuarioActual = this.authService.usuarioActual;
  }

  publicaciones: Publicacion[] = [
    {
      id: 1,
      usuario: 'Scout Main',
      alias: '@bonkboy',
      iniciales: 'SC',
      equipo: 'RED',
      tiempo: 'Hace 12 minutos',
      categoria: 'TEAM FORTRESS 2',
      titulo: '¿Cuál es el mapa que nunca se cansan de jugar?',
      contenido:
        'Después de tantas horas sigo volviendo a 2Fort. Sé que no es el mapa más competitivo, pero tiene algo especial. ¿Cuál es ese mapa al que siempre vuelven?',
      likes: 128,
      comentarios: 34,
      liked: false,
    },
    {
      id: 2,
      usuario: 'Blu Engineer',
      alias: '@texas_red',
      iniciales: 'EN',
      equipo: 'BLU',
      tiempo: 'Hace 38 minutos',
      categoria: 'HARDWARE Y VIDEOJUEGOS',
      titulo: 'Una pequeña mejora para mi setup',
      contenido:
        'Finalmente terminé de organizar mi escritorio. Después de años de cables por todos lados, puedo decir que mi estación de batalla está lista.',
      likes: 76,
      comentarios: 18,
      liked: true,
    },
    {
      id: 3,
      usuario: 'Heavy Enjoyer',
      alias: '@sandvich_time',
      iniciales: 'HV',
      equipo: 'RED',
      tiempo: 'Hace 1 hora',
      categoria: 'DEBATE',
      titulo: 'Una pregunta seria para la comunidad',
      contenido:
        '¿Ustedes prefieren jugar con amigos o conocer gente nueva dentro de los servidores? Para mí, las mejores experiencias siempre terminan conociendo a alguien.',
      likes: 52,
      comentarios: 11,
      liked: false,
    },
  ];

  alternarLike(publicacion: Publicacion): void {
    publicacion.liked = !publicacion.liked;
    publicacion.likes += publicacion.liked ? 1 : -1;
  }

  cerrarSesion(): void {
    this.authService.cerrarSesion();
    this.router.navigate(['/']);
  }
}
