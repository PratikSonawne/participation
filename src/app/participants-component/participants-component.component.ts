import { Component, OnInit, NgZone } from '@angular/core';
import zoomSdk from '@zoom/appssdk';

@Component({
  selector: 'app-participants-component',
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

    const inMeeting = await this.checkRunningContext();
    if (!inMeeting) return;

    await this.startOAuthFlow();
  }

  /* ================= SDK INIT ================= */

  async initSdk(): Promise<boolean> {
    try {
      this.log('Initializing Zoom SDK...');

      await zoomSdk.config({
        capabilities: [
          'authorize',
          'getRunningContext'
        ]
      });

      this.sdkStatus = 'CONNECTED';
      this.log('Zoom SDK CONNECTED');
      return true;

    } catch (e) {
      console.error(e);
      this.sdkStatus = 'FAILED';
      this.log('❌ SDK INIT FAILED');
      return false;
    }
  }

  /* ================= RUNNING CONTEXT ================= */

  async checkRunningContext(): Promise<boolean> {
    try {
      const ctx = await zoomSdk.getRunningContext();
      this.log(`Running Context: ${JSON.stringify(ctx)}`);

      if (ctx?.context !== 'inMeeting') {
        this.log('⚠️ App is NOT running in meeting context');
        return false;
      }

      this.log('✅ App running inside meeting context');
      return true;

    } catch (e) {
      this.log('❌ ERROR: Failed to get running context');
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
        this.log('✅ Authorization code received');

        // 🔥 NEXT STEP:
        // Send this.authorizationCode + this.codeVerifier to backend
      } else {
        this.log('⚠️ No authorization code returned');
      }

    } catch (e: any) {
      console.error(e);
      this.log(`❌ AUTHORIZE ERROR: ${JSON.stringify(e)}`);
    }
  }

  /* ================= PKCE HELPERS ================= */

  generateRandomString(length: number): string {
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let text = '';
    for (let i = 0; i < length; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }

  async generateCodeChallenge(codeVerifier: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(codeVerifier);
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
