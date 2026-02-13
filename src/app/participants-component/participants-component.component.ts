import { Component, OnInit, NgZone } from '@angular/core';
import zoomSdk from '@zoom/appssdk';

@Component({
  selector: 'app-zoom-auth',
  templateUrl: './participants-component.component.html',
  styleUrls: ['./participants-component.component.css']
})
export class ParticipantsComponentComponent implements OnInit {

  sdkStatus = 'NOT CONNECTED';
  logs: string[] = [];

  private codeVerifier = '';
  authorizationCode = '';

  constructor(private zone: NgZone) {}

  /* ================= LIFECYCLE ================= */

  async ngOnInit() {
    this.log('App Loaded');

    const sdkOk = await this.initSdk();
    if (!sdkOk) return;

    await this.startOAuthFlow();
  }

  /* ================= SDK INIT ================= */

  async initSdk(): Promise<boolean> {
    try {
      this.log('Initializing Zoom SDK...');

      await zoomSdk.config({
        capabilities: [
          'authorize'
        ]
      });

      this.sdkStatus = 'CONNECTED';
      this.log('✅ Zoom SDK CONNECTED');

      return true;

    } catch (error: any) {
      console.error(error);
      this.sdkStatus = 'FAILED';
      this.log(`❌ SDK INIT FAILED: ${JSON.stringify(error)}`);
      return false;
    }
  }

  /* ================= OAUTH FLOW ================= */

  async startOAuthFlow() {
    try {
      this.log('Generating PKCE values...');

      this.codeVerifier = this.generateRandomString(64);
      const codeChallenge = await this.generateCodeChallenge(this.codeVerifier);
      const state = this.generateRandomString(16);

      this.log('Calling zoomSdk.authorize()...');

      const response: any = await zoomSdk.authorize({
        codeChallenge,
        state
      });

      this.log(`Authorize Response: ${JSON.stringify(response)}`);

      if (response?.code) {
        this.authorizationCode = response.code;
        this.log('✅ Authorization Code Received Successfully');
      } else {
        this.log('⚠️ No Authorization Code Returned');
      }

    } catch (error: any) {
      console.error(error);
      this.log(`❌ AUTHORIZE ERROR: ${JSON.stringify(error)}`);
    }
  }

  /* ================= PKCE HELPERS ================= */

  generateRandomString(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  async generateCodeChallenge(verifier: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const digest = await crypto.subtle.digest('SHA-256', data);

    return btoa(String.fromCharCode(...new Uint8Array(digest)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  /* ================= LOG ================= */

  log(message: string) {
    const time = new Date().toLocaleTimeString();
    this.logs.unshift(`[${time}] ${message}`);
    console.log(`[${time}] ${message}`);
  }
}
