import { Component, OnInit, OnDestroy, NgZone } from '@angular/core';
import zoomSdk from '@zoom/appssdk';

interface Participant {
  participantUUID: string;
  screenName: string;
  joinTime?: string;
  leaveTime?: string;

speakingTimeMs?: number;
  speakingStartTs?: number;
  participationPercent?: number;

}

@Component({
  selector: 'app-participants-component',
  templateUrl: './participants-component.component.html',
  styleUrls: ['./participants-component.component.css']
})
export class ParticipantsComponentComponent implements OnInit, OnDestroy {


  private speakingPoller: any;
private SPEAKING_POLL_INTERVAL = 1000; // 1 second

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
await this.syncParticipants();
this.registerParticipantListener();

// 🔥 START speaking tracking
this.startSpeakingTracker();


    this.log('App Loaded');

    const ok = await this.initSdk();
    if (!ok) return;

    await this.syncParticipants();          // initial load
    this.registerParticipantListener();     // realtime updates
  }

  ngOnDestroy() {
    zoomSdk.off('onParticipantChange', this.participantChangeHandler);
    if (this.speakingPoller) {
  clearInterval(this.speakingPoller);
}

  }

  /* ================= SDK INIT ================= */

  async initSdk(): Promise<boolean> {
    try {
      this.log('Initializing Zoom SDK...');

      await zoomSdk.config({
        capabilities: [
          'getMeetingParticipants',
          'onParticipantChange',
          'setAudioState',
          'getRunningContext'
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

startSpeakingTracker() {
  this.log('Speaking tracker STARTED');

  this.speakingPoller = setInterval(async () => {
    try {
      const res = await zoomSdk.getMeetingParticipants();
      const now = Date.now();

      this.zone.run(() => {

        /* ================== LOOP 1 ==================
           Detect START / STOP speaking
        ================================================= */
        res.participants.forEach((rp: any) => {

          this.log(
            `SPEAK CHECK → ${rp.screenName} | isSpeaking=${rp.isSpeaking}`
          );

          const local = this.participants.find(
            p => p.participantUUID === rp.participantUUID
          );
          if (!local) return;

          local.speakingTimeMs ??= 0;

          // 🎤 START speaking
          if (rp.isSpeaking && !local.speakingStartTs) {
            local.speakingStartTs = now;
            this.log(`🎤 START SPEAKING: ${rp.screenName}`);
          }

          // 🛑 STOP speaking
          if (!rp.isSpeaking && local.speakingStartTs) {
            local.speakingTimeMs += now - local.speakingStartTs;
            local.speakingStartTs = undefined;
            this.log(`🛑 STOP SPEAKING: ${rp.screenName}`);
          }
        });

        /* ================== LOOP 2 (FIX-3) ==================
           ⏱ Add time while STILL speaking
        ====================================================== */
        this.participants.forEach(p => {
          if (p.speakingStartTs) {
            p.speakingTimeMs! += this.SPEAKING_POLL_INTERVAL;
          }
        });

        /* ================== CALCULATE % ================== */
        this.calculateParticipationPercentage();
      });

    } catch (e) {
      this.log('Speaking tracker ERROR');
    }
  }, this.SPEAKING_POLL_INTERVAL);
}


calculateParticipationPercentage() {
  const totalSpeakingTime = this.participants.reduce(
    (sum, p) => sum + (p.speakingTimeMs || 0),
    0
  );

  this.participants.forEach(p => {
    p.participationPercent = totalSpeakingTime
      ? +( (p.speakingTimeMs! / totalSpeakingTime) * 100 ).toFixed(2)
      : 0;
  });
}



}
