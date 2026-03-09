import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class Aiservice {
  constructor(private http: HttpClient) {}

  sendMessage(message: string, sessionId: string, lang: string, client: string) {
    const api =
      window.location.hostname === 'localhost' ? 'http://localhost:3000/api/chat' : '/api/chat';

    return this.http.post<{ reply: string }>(api, { message, sessionId, lang, client });
  }
}
