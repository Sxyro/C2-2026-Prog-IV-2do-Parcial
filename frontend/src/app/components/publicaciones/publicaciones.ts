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
}

@Component({
  selector: 'app-publicaciones',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './publicaciones.html',
  styleUrl: './publicaciones.scss',
})
export class PublicacionesComponent {
  readonly usuarioActual: AuthService['usuarioActual'];

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
    },
    {
      id: 4,
      usuario: 'Medic Main',
      alias: '@ubercharge',
      iniciales: 'MD',
      equipo: 'BLU',
      tiempo: 'Hace 2 horas',
      categoria: 'TEAM FORTRESS 2',
      titulo: '¿Es posible ganar sin un buen Medic?',
      contenido:
        'Después de varias partidas jugando como Medic, llegué a una conclusión: nadie valora lo suficiente a quien mantiene vivo al equipo. ¿Qué opinan?',
      likes: 93,
      comentarios: 27,
    },
  ];

  cerrarSesion(): void {
    this.authService.cerrarSesion();
    this.router.navigate(['/']);
  }
}
