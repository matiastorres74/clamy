import { Pipe, PipeTransform } from '@angular/core';

const formatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
});

export function formatArsCurrency(value: number): string {
  return formatter.format(value);
}

@Pipe({ name: 'arsCurrency' })
export class ArsCurrencyPipe implements PipeTransform {
  // Price is optional on the model (public responses omit it), so render a
  // dash rather than "$ NaN" if it is ever missing.
  transform(value: number | null | undefined): string {
    return typeof value === 'number' ? formatArsCurrency(value) : '—';
  }
}
