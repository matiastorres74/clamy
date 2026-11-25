import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Navbar } from './shared/navbar/navbar';
import { Footer } from './shared/footer/footer';
import { CategoryService } from './core/services/category';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Navbar, Footer],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  constructor() {
    // Every page shows the category list somewhere (at least the navbar), so
    // it is fetched once here, during SSR as well.
    inject(CategoryService).load().subscribe();
  }
}
