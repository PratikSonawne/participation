import { Component, OnInit, OnDestroy } from '@angular/core';
import zoomSdk from '@zoom/appssdk';

interface Participant {
  participantId: string;
  userName: string;
  joinTime?: string;
  leaveTime?: string;
}
interface Log {
  time: string;
  message: string;
  type: 'info' | 'success' | 'error';
}

@Component({
  selector: 'app-participants-component',
  templateUrl: './participants-component.component.html',
  styleUrls: ['./participants-component.component.css']
})
export class ParticipantsComponentComponent implements OnInit {

  logs: Log[] = [];
  participants: any[] = [];
  sdkConnected = false;

  ngOnInit() {
    this.addLog('App Loaded', 'info');
    this.initSdk();
  }

  addLog(message: string, type: Log['type']) {
    this.logs.unshift({
      time: new Date().toLocaleTimeString(),
      message,
      type
    });
  }

  async initSdk() {
    try {
      if (!zoomSdk) {
        this.addLog('zoomSdk NOT found', 'error');
        return;
      }

      this.addLog('zoomSdk found', 'success');

      await zoomSdk.config({
        capabilities: ['getMeetingParticipants']
      });

      this.sdkConnected = true;
      this.addLog('zoomSdk.config SUCCESS', 'success');

      await this.loadParticipants();

    } catch (e: any) {
      this.addLog('SDK ERROR: ' + (e?.message || 'Unknown error'), 'error');
    }
  }

  async loadParticipants() {
    try {
      this.addLog('Fetching participants...', 'info');

      const res = await zoomSdk.getMeetingParticipants();
      this.participants = res?.participants || [];

      this.addLog(
        `Participants loaded: ${this.participants.length}`,
        'success'
      );

    } catch (e: any) {
      this.addLog('getMeetingParticipants FAILED', 'error');
    }
  }
}