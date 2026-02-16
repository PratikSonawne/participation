import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ZoomService {

  private baseUrl = 'http://localhost:8080/zoom';

  constructor(private http: HttpClient) {}

  getAccessToken(code: string) {
    return this.http.get(`${this.baseUrl}/callback?code=${code}`);
  }
}

