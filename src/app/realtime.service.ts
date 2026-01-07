import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class RealtimeService {

  private eventSource!: EventSource;

  connect(onUpdate: (data: any) => void) {

    this.eventSource = new EventSource(
      'http://localhost:9999/api/realtime/participants'
    );

    this.eventSource.addEventListener('PARTICIPANT_UPDATE', (event: any) => {
      const data = JSON.parse(event.data);
      onUpdate(data);
    });

    this.eventSource.onerror = (error) => {
      console.error('SSE error', error);
      this.eventSource.close();
    };
  }

  disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
    }
  }
}
