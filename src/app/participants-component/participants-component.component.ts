import { Component, OnInit, OnDestroy } from '@angular/core';
import zoomSdk from '@zoom/appssdk';

interface Participant {
  participantId: string;
  userName: string;
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

  // keep handler reference (IMPORTANT)
  private participantChangeHandler = (event: any) => this.onParticipantChange(event);

  async ngOnInit() {
    this.log('App Loaded');
    await this.initSdk();
    await this.loadParticipants();
    this.registerParticipantListener();
  }

  ngOnDestroy() {
    // ✅ off() MUST receive handler
    zoomSdk.off('onParticipantChange', this.participantChangeHandler);
  }

  /* ================= SDK INIT ================= */

  async initSdk() {
    try {
      this.log('Initializing Zoom SDK...');
      await zoomSdk.config({
        capabilities: [
          'getMeetingParticipants',
          'onParticipantChange',
          'setAudioState'
        ]
      });

      this.sdkStatus = 'CONNECTED';
      this.log('Zoom SDK CONNECTED');
    } catch (e) {
      this.sdkStatus = 'FAILED';
      this.log('SDK INIT FAILED');
    }
  }

  /* ================= PARTICIPANTS ================= */

  async loadParticipants() {
    try {
      this.log('Fetching participants...');
      const res = await zoomSdk.getMeetingParticipants();

      const now = new Date().toISOString();
      this.participants = res.participants.map((p: any) => ({
        participantId: p.participantId,
        userName: p.userName,
        joinTime: now
      }));

      this.log(`Loaded ${this.participants.length} participants`);
    } catch {
      this.log('getMeetingParticipants FAILED');
    }
  }

  registerParticipantListener() {
    zoomSdk.on('onParticipantChange', this.participantChangeHandler);
  }

  onParticipantChange(event: any) {
    const now = new Date().toISOString();

    event.joined?.forEach((p: any) => {
      this.participants.push({
        participantId: p.participantId,
        userName: p.userName,
        joinTime: now
      });
      this.log(`JOIN: ${p.userName}`);
    });

    event.left?.forEach((p: any) => {
      const found = this.participants.find(x => x.participantId === p.participantId);
      if (found) {
        found.leaveTime = now;
        this.log(`LEAVE: ${found.userName}`);
      }
    });
  }

  /* ================= AUDIO CONTROL ================= */

 async mute() {
  try {
    await zoomSdk.setAudioState({ audio: false });
    this.isMuted = true;
    this.log('Muted self');
  } catch {
    this.log('Mute FAILED');
  }
}

async unmute() {
  try {
    await zoomSdk.setAudioState({ audio: true });
    this.isMuted = false;
    this.log('Unmuted self');
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