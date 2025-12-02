import { Injectable } from '@nestjs/common';
import { Subject, Observable, filter, map } from 'rxjs';

export type CustomFieldsEvent = {
  centerName: string | null;
  entityType: 'lead';
  action: 'create' | 'update' | 'delete';
  fieldId: string;
};

@Injectable()
export class CustomFieldsEvents {
  private subject = new Subject<CustomFieldsEvent>();

  emit(event: CustomFieldsEvent) {
    this.subject.next(event);
  }

  stream(): Observable<CustomFieldsEvent> {
    return this.subject.asObservable();
  }

  streamFor(centerName: string | null, entityType: 'lead' = 'lead'): Observable<MessageEvent> {
    return this.stream().pipe(
      filter((e) => e.entityType === entityType && (e.centerName === centerName)),
      map((e) => ({ data: e }) as MessageEvent),
    );
  }
}
