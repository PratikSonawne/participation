import { Component, OnInit, OnDestroy, NgZone } from '@angular/core';
import zoomSdk from '@zoom/appssdk';

interface Participant {
  participantUUID: string;
  screenName: string;
  joinTime?: string;
  leaveTime?: string;
}

@Component({
  selector: 'app-participants-component',
  templateUrl: './participants-component.component.html',
  styleUrls: ['./participants-component.component.css']
})
export class ParticipantsComponentComponent implements OnInit, OnDestroy {

  sdkStatus = 'NOT CONNECTED';
  isMuted = false;
accessToken = '';

  participants: Participant[] = [];
  logs: string[] = [];

  // 🔴 NEW: Meeting UUID
  meetingUUID = '';

  constructor(private zone: NgZone) {}

  /* ================= PARTICIPANT EVENT ================= */

  private participantChangeHandler = async () => {
    this.zone.run(() => {
      this.log('EVENT: onParticipantChange fired');
    });
    await this.syncParticipants('EVENT');
  };

  /* ================= LIFECYCLE ================= */

  async ngOnInit() {
    this.log('App Loaded');

    const ok = await this.initSdk();
    if (!ok) return;
await this.checkRunningContext();
  // ✅ Get token
  await this.fetchAccessToken();
await this.loadMeetingUUID();

    // 🔴 NEW: Load meeting UUID
    await this.loadMeetingUUID();

    await this.syncParticipants('INIT');
    this.registerParticipantListener();
  }

  ngOnDestroy() {
    zoomSdk.off('onParticipantChange', this.participantChangeHandler);
    this.log('Participant listener removed');
  }

  /* ================= SDK INIT ================= */

  async initSdk(): Promise<boolean> {
    try {
      this.log('Initializing Zoom SDK...');

      await zoomSdk.config({
        capabilities: [
           'authorize',  
          'getMeetingUUID',          // 🔴 REQUIRED
          'getMeetingParticipants',
          'onParticipantChange',
          'setAudioState'
        ]
      });

      this.sdkStatus = 'CONNECTED';
      this.log('Zoom SDK CONNECTED');
      return true;

    } catch (e) {
      console.error(e);
      this.sdkStatus = 'FAILED';
      this.log('SDK INIT FAILED');
      return false;
    }
  }

  /* ================= MEETING UUID ================= */

  async loadMeetingUUID() {
    try {
      this.log('Fetching Meeting UUID...');

      const res = await zoomSdk.getMeetingUUID();
      this.meetingUUID = res.meetingUUID;

      this.log(`Meeting UUID loaded: ${this.meetingUUID}`);
    } catch (e) {
      console.error(e);
      this.log('ERROR: Failed to get Meeting UUID');
    }
  }

  /* ================= PARTICIPANT SYNC ================= */

  async syncParticipants(source: 'INIT' | 'EVENT') {
    try {
      this.log(`syncParticipants called [${source}]`);

      const now = new Date().toISOString();
      const res = await zoomSdk.getMeetingParticipants();

      this.log(`Zoom returned ${res.participants.length} participants`);

      this.zone.run(() => {

        // JOIN
        res.participants.forEach((rp: any) => {
          const exists = this.participants.some(
            p => p.participantUUID === rp.participantUUID
          );

          if (!exists) {
            this.participants.push({
              participantUUID: rp.participantUUID,
              screenName: rp.screenName,
              joinTime: now
            });
            this.log(`JOIN: ${rp.screenName}`);
          }
        });

        // LEAVE
        this.participants.forEach(p => {
          const stillHere = res.participants.some(
            (rp: any) => rp.participantUUID === p.participantUUID
          );

          if (!stillHere && !p.leaveTime) {
            p.leaveTime = now;
            this.log(`LEAVE: ${p.screenName}`);
          }
        });

      });

    } catch (e) {
      console.error(e);
      this.log('ERROR: Participant sync FAILED');
    }
  }

  registerParticipantListener() {
    zoomSdk.on('onParticipantChange', this.participantChangeHandler);
    this.log('Participant change listener registered');
  }

  /* ================= AUDIO CONTROL ================= */

  async mute() {
    this.log('Mute clicked');
    try {
      await zoomSdk.setAudioState({ audio: false });
      this.zone.run(() => {
        this.isMuted = true;
        this.log('Muted self');
      });
    } catch {
      this.log('Mute FAILED');
    }
  }

  async unmute() {
    this.log('Unmute clicked');
    try {
      await zoomSdk.setAudioState({ audio: true });
      this.zone.run(() => {
        this.isMuted = false;
        this.log('Unmuted self');
      });
    } catch {
      this.log('Unmute FAILED');
    }
  }
async checkRunningContext() {
  try {
    const ctx = await zoomSdk.getRunningContext();
    this.log(`Running Context: ${JSON.stringify(ctx)}`);

    if (ctx?.context !== 'inMeeting') {
      this.log('⚠️ App is NOT running in meeting context');
    } else {
      this.log('✅ App running inside meeting context');
    }
  } catch (e) {
    this.log('ERROR: Failed to get running context');
  }
}

  /* ================= LOG ================= */

  log(msg: string) {
    const time = new Date().toLocaleTimeString();
    this.logs.unshift(`[${time}] ${msg}`);
    console.log(`[${time}] ${msg}`);
  }

async fetchAccessToken() {
  try {
    this.log('Generating PKCE values...');

    const codeVerifier = this.generateRandomString(64);
    const codeChallenge = await this.generateCodeChallenge(codeVerifier);
    const state = this.generateRandomString(16);

    this.log('Requesting access token via authorize()...');

    const authResponse: any = await zoomSdk.authorize({
      codeChallenge,
      state
    });

    this.log(`Authorize response: ${JSON.stringify(authResponse)}`);

  } catch (e) {
    console.error(e);
    this.log('❌ ERROR during authorize()');
  }
}


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

}
