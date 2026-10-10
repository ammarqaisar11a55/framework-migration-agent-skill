import { Routes } from '@angular/router';
import { Detail } from './pages/detail';
import { Home } from './pages/home';

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'detail', component: Detail },
];
