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

  meetingId!: string;

  private apiUrl = 'https://nuke-dealtime-equal-ultimately.trycloudflare.com/api/test/meetings';

  constructor(
    private zone: NgZone,
    private http: HttpClient
  ) {}

  /* ================= PARTICIPANT EVENT ================= */

  private participantChangeHandler = async () => {
    this.zone.run(() => this.log('Participant change detected'));
    await this.syncParticipants();
  };

  /* ================= LIFECYCLE ================= */

  async ngOnInit() {
    this.log('App Loaded');

    const ok = await this.initSdk();
    if (!ok) return;

    await this.loadMeetingContext();   // 🔹 GET MEETING ID
    await this.syncParticipants();
    this.registerParticipantListener();
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
          'getMeetingParticipants',
          'getRunningContext',
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

  /* ================= MEETING CONTEXT ================= */

  async loadMeetingContext() {
  try {
    const context = await zoomSdk.getRunningContext();

    // 🔧 Zoom SDK typing FIX
    const meetingContext = (context as any).meeting;

    if (meetingContext?.meetingId) {
      this.meetingId = meetingContext.meetingId;
      this.log(`Meeting ID: ${this.meetingId}`);
    } else {
      this.log('Meeting context not available');
    }

  } catch (e) {
    console.error(e);
    this.log('Failed to get meeting context');
  }
}



  /* ================= PARTICIPANT SYNC ================= */

  async syncParticipants() {
    try {
      const now = new Date().toISOString();
      const res = await zoomSdk.getMeetingParticipants();

      this.zone.run(() => {

        // JOIN
        res.participants.forEach((rp: any) => {
          const exists = this.participants.find(
            p => p.participantUUID === rp.participantUUID
          );

          if (!exists) {
            const participant: Participant = {
              participantUUID: rp.participantUUID,
              screenName: rp.screenName,
              joinTime: now
            };

            this.participants.push(participant);
            this.log(`JOIN: ${rp.screenName}`);

            this.saveParticipantToBackend(participant);
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

            this.saveParticipantToBackend(p);
          }
        });

      });

    } catch (e) {
      console.error(e);
      this.log('Participant sync FAILED');
    }
  }

  registerParticipantListener() {
    zoomSdk.on('onParticipantChange', this.participantChangeHandler);
  }

  /* ================= BACKEND API ================= */

  saveParticipantToBackend(participant: Participant) {
    if (!this.meetingId) return;

    this.http.post(
      `${this.apiUrl}/${this.meetingId}/participants`,
      participant
    ).subscribe({
      next: () => this.log(`Saved: ${participant.screenName}`),
      error: () => this.log(`Backend save FAILED: ${participant.screenName}`)
    });
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

  /* ================= LOGS ================= */

  log(msg: string) {
    const time = new Date().toLocaleTimeString();
    this.logs.unshift(`[${time}] ${msg}`);
  }
}
