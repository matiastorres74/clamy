import { Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Product } from '../../core/models/product.model';
import { CategoryService } from '../../core/services/category';
import { imageSrc, imageSrcset } from '../image-url';

@Component({
  selector: 'app-product-card',
  imports: [RouterLink],
  templateUrl: './product-card.html',
  styleUrl: './product-card.css',
})
export class ProductCard {
  product = input.required<Product>();
  private categoryService = inject(CategoryService);
  protected categoryLabel = (id: string) => this.categoryService.label(id);
  protected imageSrc = imageSrc;
  protected imageSrcset = imageSrcset;
}
