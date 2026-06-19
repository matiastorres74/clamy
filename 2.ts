import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { Product } from '../models/product';

@Injectable({
  providedIn: 'root'
})
export class ProductService {

  private products: Product[] = [
    {
      id: 1,
      nombre: 'Lámpara Moderna',
      descripcion: 'Lámpara decorativa LED',
      precio: 25000,
      imagen: 'assets/images/productos/lampara.jpg',
      categoria: 'Iluminación',
      destacado: true
    },
    {
      id: 2,
      nombre: 'Set de Tazas',
      descripcion: 'Juego de 6 tazas',
      precio: 12000,
      imagen: 'assets/images/productos/tazas.jpg',
      categoria: 'Bazar',
      destacado: false
    }
  ];

  getProducts(): Observable<Product[]> {
    return of(this.products);
  }

}