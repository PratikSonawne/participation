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

  /* ================= LOG ================= */

  log(msg: string) {
    const time = new Date().toLocaleTimeString();
    this.logs.unshift(`[${time}] ${msg}`);
    console.log(`[${time}] ${msg}`);
  }
}
