import { Component, OnInit, OnDestroy, NgZone } from '@angular/core';
import zoomSdk from '@zoom/appssdk';
import { HttpClient } from '@angular/common/http';

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
  participants: Participant[] = [];
  logs: string[] = [];

  meetingId = '';
  pollIntervalId: any;

  // 🔴 DUMMY / REAL API (must be reachable)
  private apiUrl =
    'https://nuke-dealtime-equal-ultimately.trycloudflare.com/api/test';

  constructor(
    private zone: NgZone,
    private http: HttpClient
  ) {}

  /* ================= LIFECYCLE ================= */

  async ngOnInit() {
    this.log('App loaded');

    if (!(await this.initSdk())) return;

    await this.loadMeetingId();
    await this.initialSync();

    this.registerParticipantListener();
    this.startPolling(); // 🔥 MOST IMPORTANT
  }

  ngOnDestroy() {
    zoomSdk.off('onParticipantChange', this.onParticipantChange);
    clearInterval(this.pollIntervalId);
  }

  /* ================= SDK INIT ================= */

  async initSdk(): Promise<boolean> {
    try {
      await zoomSdk.config({
        capabilities: [
          'getMeetingContext',
          'getMeetingParticipants',
          'setAudioState'
        ]
      });

      this.sdkStatus = 'CONNECTED';
      this.log('Zoom SDK connected');
      return true;
    } catch (e) {
      console.error(e);
      this.log('Zoom SDK init failed');
      return false;
    }
  }

  /* ================= MEETING ID ================= */

  async loadMeetingId() {
    try {
      const ctx = await zoomSdk.getMeetingContext();
      this.meetingId = ctx.meetingID;
      this.log(`Meeting ID: ${this.meetingId}`);
    } catch (e) {
      this.meetingId = 'UNKNOWN';
      this.log('Meeting ID not accessible (not host/co-host)');
    }
  }

  /* ================= INITIAL LOAD ================= */

  async initialSync() {
    const res = await zoomSdk.getMeetingParticipants();
    const now = new Date().toISOString();

    this.zone.run(() => {
      this.participants = res.participants.map((p: any) => ({
        participantUUID: p.participantUUID,
        screenName: p.screenName,
        joinTime: now
      }));
    });

    this.log(`Initial participants loaded: ${this.participants.length}`);
  }

  /* ================= PARTICIPANT EVENT ================= */

  private onParticipantChange = async () => {
    this.log('onParticipantChange event fired');
    await this.syncParticipants('EVENT');
  };

  registerParticipantListener() {
    zoomSdk.on('onParticipantChange', this.onParticipantChange);
  }

  /* ================= POLLING (LEAVE FIX) ================= */

  startPolling() {
    this.pollIntervalId = setInterval(() => {
      this.syncParticipants('POLL');
    }, 3000);

    this.log('Polling started (every 3 sec)');
  }

  /* ================= CORE SYNC LOGIC ================= */

  async syncParticipants(source: 'EVENT' | 'POLL') {
    try {
      const res = await zoomSdk.getMeetingParticipants();
      const now = new Date().toISOString();

      const latestIds = res.participants.map((p: any) => p.participantUUID);

      // 🔹 JOIN
      res.participants.forEach((rp: any) => {
        const exists = this.participants.some(
          p => p.participantUUID === rp.participantUUID
        );

        if (!exists) {
          const participant: Participant = {
            participantUUID: rp.participantUUID,
            screenName: rp.screenName,
            joinTime: now
          };

          this.zone.run(() => {
            this.participants = [...this.participants, participant];
            this.log(`JOIN (${source}): ${participant.screenName}`);
          });

          this.callApi('JOIN', participant);
        }
      });

      // 🔹 LEAVE (🔥 FIXED)
      this.participants.forEach(p => {
        if (!latestIds.includes(p.participantUUID) && !p.leaveTime) {
          const updated: Participant = {
            ...p,
            leaveTime: now
          };

          this.zone.run(() => {
            this.participants = this.participants.map(x =>
              x.participantUUID === p.participantUUID ? updated : x
            );
            this.log(`LEAVE (${source}): ${p.screenName}`);
          });

          this.callApi('LEAVE', updated);
        }
      });

    } catch (e) {
      console.error(e);
      this.log('syncParticipants failed');
    }
  }

  /* ================= API (FORCED CALL + LOGS) ================= */

  private callApi(action: 'JOIN' | 'LEAVE', participant: Participant) {
    const payload = {
      action,
      meetingId: this.meetingId,
      participant,
      timestamp: new Date().toISOString()
    };

    console.log('🚀 API CALL →', payload);
    this.log(`API CALL (${action}) → ${participant.screenName}`);

    this.zone.runOutsideAngular(() => {
      this.http
        .post(`${this.apiUrl}/participants`, payload)
        .subscribe({
          next: () => {
            console.log('✅ API SUCCESS');
            this.zone.run(() =>
              this.log(`API SUCCESS → ${participant.screenName}`)
            );
          },
          error: err => {
            console.error('❌ API ERROR', err);
            this.zone.run(() =>
              this.log(`API ERROR → ${participant.screenName}`)
            );
          }
        });
    });
  }

  /* ================= LOG ================= */

  log(msg: string) {
    const time = new Date().toLocaleTimeString();
    this.logs.unshift(`[${time}] ${msg}`);
  }
}
