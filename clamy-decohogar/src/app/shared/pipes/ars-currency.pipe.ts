import { Pipe, PipeTransform } from '@angular/core';

const formatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
});

@Pipe({ name: 'arsCurrency' })
export class ArsCurrencyPipe implements PipeTransform {
  transform(value: number): string {
    return formatter.format(value);
  }
}
