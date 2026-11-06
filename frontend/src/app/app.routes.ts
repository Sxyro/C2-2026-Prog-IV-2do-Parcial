import { Routes } from '@angular/router';
import { InicioComponent } from './components/inicio/inicio';
import { RegistroComponent } from './components/registro/registro';
import { LoginComponent } from './components/login/login';
import { PublicacionesComponent } from './components/publicaciones/publicaciones';
import { MiPerfilComponent } from './components/mi-perfil/mi-perfil';

export const routes: Routes = [
  { path: '', component: InicioComponent },
  { path: 'registro', component: RegistroComponent },
  { path: 'login', component: LoginComponent },
  { path: 'publicaciones', component: PublicacionesComponent },
  { path: 'mi-perfil', component: MiPerfilComponent },
];
