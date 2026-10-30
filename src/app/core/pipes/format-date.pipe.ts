import { Pipe, PipeTransform } from '@angular/core';
import { formatDateTime, formatDate } from '../utils/date.util';

@Pipe({
  name: 'formatDate',
  standalone: true,
})
export class FormatDatePipe implements PipeTransform {
  transform(value: string | null | undefined, includeTime = false): string | null {
    return includeTime ? formatDateTime(value) : formatDate(value);
  }
}
