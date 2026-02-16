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

  participants: Participant[] = [];
  logs: string[] = [];

  constructor(private zone: NgZone) {}

  // 🔴 IMPORTANT: handler reference
  private participantChangeHandler = async () => {
    this.zone.run(() => {
      this.log('Participant change detected');
    });
    await this.syncParticipants();
  };

  /* ================= LIFECYCLE ================= */

  async ngOnInit() {
    this.log('App Loaded');

    const ok = await this.initSdk();
    if (!ok) return;

    await this.syncParticipants();          // initial load
    this.registerParticipantListener();     // realtime updates
  }

  ngOnDestroy() {
    zoomSdk.off('onParticipantChange', this.participantChangeHandler);
  }

  /* ================= SDK INIT ================= */

  async initSdk(): Promise<boolean> {
    try {
      this.log('Initializing Zoom SDK...');

      await zoomSdk.config({
        capabilities: [
          'getMeetingContext',
          'getMeetingParticipants',
          'onParticipantChange',
          'setAudioState'
        ]
      });

      this.sdkStatus = 'CONNECTED';
      this.log('Zoom SDK CONNECTED');
      return true;

    } catch (e) {
      console.error('Zoom SDK init error:', e);
      this.sdkStatus = 'FAILED';
      this.log('SDK INIT FAILED');
      return false;
    }
  }

  /* ================= PARTICIPANT SYNC ================= */

  async syncParticipants() {
    try {
       const context = await zoomSdk.getRunningContext();

if (context.context !== 'inMeeting') {
  this.log('Not inside meeting');
  return;
}
      const now = new Date().toISOString();
      const res = await zoomSdk.getMeetingParticipants();

      // 🔴 NgZone is MUST for UI update
      this.zone.run(() => {

        // JOIN detection
        res.participants.forEach((p: any) => {
          const exists = this.participants.find(
            x => x.participantUUID === p.participantUUID
          );

          if (!exists) {
            this.participants.push({
              participantUUID: p.participantUUID,
              screenName: p.screenName,
              joinTime: now
            });
            this.log(`JOIN: ${p.screenName}`);
          }
        });

        // LEAVE detection
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

    } catch (e: any) {
  console.error('Participant Sync Error:', e);
  this.log('Participant sync FAILED: ' + JSON.stringify(e));
}

  }

  registerParticipantListener() {
    zoomSdk.on('onParticipantChange', this.participantChangeHandler);
  }

  /* ================= AUDIO CONTROL ================= */

  async mute() {
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

 

  /* ================= UI LOGS ================= */

  log(msg: string) {
    const time = new Date().toLocaleTimeString();
    this.logs.unshift(`[${time}] ${msg}`);
  }
}