import { DatePipe } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Publicacion } from '../../services/publicaciones';

@Component({
  selector: 'app-publicacion-item',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './publicacion-componente.html',
  styleUrl: './publicacion-componente.scss',
})
export class PublicacionComponent {
  @Input({ required: true }) publicacion!: Publicacion;
  @Input() puedeEliminar = false;
  @Input() usuarioAutenticado = false;
  @Input() likeEnProceso = false;

  @Output() solicitarLike = new EventEmitter<Publicacion>();
  @Output() solicitarEliminar = new EventEmitter<Publicacion>();

  darLike(): void {
    if (this.likeEnProceso || !this.usuarioAutenticado) {
      return;
    }

    this.solicitarLike.emit(this.publicacion);
  }

  eliminar(): void {
    this.solicitarEliminar.emit(this.publicacion);
  }
}
