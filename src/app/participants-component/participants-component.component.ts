import { Component, OnInit, OnDestroy } from '@angular/core';
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

  // keep handler reference (IMPORTANT)
  private participantChangeHandler = async (_event: any) => {
    this.log('Participant change detected');
    await this.syncParticipants();
  };

  /* ================= LIFECYCLE ================= */

  async ngOnInit() {
    this.log('App Loaded');

    const initialized = await this.initSdk();
    if (!initialized) return; // ⛔ stop if SDK failed

    await this.checkRunningContext();
    await this.syncParticipants(); // initial load
    this.registerParticipantListener();
  }

  ngOnDestroy() {
    zoomSdk.off('onParticipantChange', this.participantChangeHandler);
  }

  /* ================= SDK INIT ================= */

 async initSdk(): Promise<boolean> {
  try {
    await zoomSdk.config({
      capabilities: ['getRunningContext']
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


  async checkRunningContext() {
    try {
      const ctx: any = await zoomSdk.getRunningContext();
      const runningContext = ctx.runningContext || ctx.context || 'unknown';
      this.log(`Running Context: ${runningContext}`);
    } catch {
      this.log('Failed to get running context');
    }
  }

  /* ================= PARTICIPANT SYNC ================= */

  async syncParticipants() {
    try {
      const now = new Date().toISOString();
      const res = await zoomSdk.getMeetingParticipants();

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
        const stillPresent = res.participants.some(
          (rp: any) => rp.participantUUID === p.participantUUID
        );

        if (!stillPresent && !p.leaveTime) {
          p.leaveTime = now;
          this.log(`LEAVE: ${p.screenName}`);
        }
      });

    } catch (e) {
      console.error(e);
      this.log('Participant sync FAILED');
    }
  }

  registerParticipantListener() {
    zoomSdk.on('onParticipantChange', this.participantChangeHandler);
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
