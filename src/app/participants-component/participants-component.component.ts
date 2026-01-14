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
  isMuted = false;

  participants: Participant[] = [];
  logs: string[] = [];

  meetingId = '';

  private apiUrl =
    'https://nuke-dealtime-equal-ultimately.trycloudflare.com/api/test/meetings';

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
  }

  ngOnDestroy() {
    zoomSdk.off('onParticipantChange', this.onParticipantChange);
  }

  /* ================= SDK INIT ================= */

  async initSdk(): Promise<boolean> {
    try {
      await zoomSdk.config({
        capabilities: [
          'getMeetingParticipants',
          'getRunningContext',
          'setAudioState',
           'getMeetingContext'
        ]
      });

      this.sdkStatus = 'CONNECTED';
      this.log('Zoom SDK connected');
      return true;

    } catch (e) {
      console.error(e);
      this.sdkStatus = 'FAILED';
      this.log('SDK init failed');
      return false;
    }
  }

  /* ================= MEETING ID ================= */

async loadMeetingId() {
  try {
    const ctx = await zoomSdk.getMeetingContext();
    this.meetingId = ctx.meetingID;
    this.log(`Meeting ID: ${this.meetingId}`);
  } catch {
    this.log('Meeting ID not accessible (not host)');
    this.meetingId = 'UNKNOWN';
  }
}


  /* ================= INITIAL SYNC ================= */

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
  }

  /* ================= PARTICIPANT EVENTS ================= */

  private onParticipantChange = async () => {
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

        // UI update first
        this.zone.run(() => {
          this.participants = [...this.participants, participant];
          this.log(`JOIN: ${participant.screenName}`);
        });

        // Backend async (non-blocking)
        this.sendToBackend(participant);
      }
    });

    // 🔹 LEAVE
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
          this.log(`LEAVE: ${p.screenName}`);
        });

        this.sendToBackend(updated);
      }
    });
  };

  registerParticipantListener() {
    zoomSdk.on('onParticipantChange', this.onParticipantChange);
  }

  /* ================= BACKEND SYNC ================= */

  private sendToBackend(participant: Participant) {
    if (!this.meetingId) return;

    // run outside Angular zone → no UI blocking
    this.zone.runOutsideAngular(() => {
      this.http
        .post(
          `${this.apiUrl}/${this.meetingId}/participants`,
          participant
        )
        .subscribe({
          error: () =>
            this.zone.run(() =>
              this.log(`Backend error: ${participant.screenName}`)
            )
        });
    });
  }

  /* ================= AUDIO ================= */

  async mute() {
    await zoomSdk.setAudioState({ audio: false });
    this.zone.run(() => (this.isMuted = true));
  }

  async unmute() {
    await zoomSdk.setAudioState({ audio: true });
    this.zone.run(() => (this.isMuted = false));
  }

  /* ================= LOG ================= */

  log(msg: string) {
    const time = new Date().toLocaleTimeString();
    this.logs.unshift(`[${time}] ${msg}`);
  }
}
