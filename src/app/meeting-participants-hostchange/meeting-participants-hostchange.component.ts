import { Component, OnInit } from '@angular/core';
import zoomSdk from '@zoom/appssdk';

interface Participant {
  uuid: string;
  name: string;
  role: number;
}

@Component({
  selector: 'app-meeting-participants-hostchange',
  templateUrl: './meeting-participants-hostchange.component.html',
  styleUrls: ['./meeting-participants-hostchange.component.css']
})
export class MeetingParticipantsHostchangeComponent implements OnInit {

  participants: Participant[] = [];
  logs: string[] = [];

  private currentHostUUID: string | null = null;
  private previousParticipantsRaw: any[] = [];

  async ngOnInit(): Promise<void> {
    await this.initializeZoom();
  }

  /* ------------------ Logging ------------------ */

  private log(message: string): void {
    const time = new Date().toLocaleTimeString();
    this.logs.unshift(`[${time}] ${message}`);
  }

  /* ------------------ SDK Init ------------------ */

  private async initializeZoom(): Promise<void> {
    try {
      await zoomSdk.config({
        capabilities: [
          'getMeetingParticipants',
          'onParticipantChange'
        ]
      });

      this.log('✅ Zoom SDK configured successfully');

      await this.loadParticipants();

      zoomSdk.onParticipantChange(async () => {
        this.log('🔄 Participant change event triggered');
        await this.loadParticipants();
      });

    } catch (error: any) {
      this.log('❌ SDK Init Error: ' + JSON.stringify(error));
    }
  }

  /* ------------------ Load Participants ------------------ */

  private async loadParticipants(): Promise<void> {
    try {
      const response: any = await zoomSdk.getMeetingParticipants();

      console.log('RAW SDK RESPONSE:', response);

      if (!response || !response.participants) {
        this.log('⚠ No participants data received');
        return;
      }

      const rawList = response.participants;

      // Detect host change BEFORE updating state
      this.detectHostChange(rawList);

      // Map clean UI model
      this.participants = rawList.map((p: any) => ({
        uuid: p.participantUUID,
        name: p.screenName || p.displayName || p.userName || 'Unknown',
        role: Number(p.role)
      }));

      this.previousParticipantsRaw = rawList;

      this.log(`👥 Participants updated (${this.participants.length})`);

    } catch (error: any) {
      this.log('❌ Error fetching participants: ' + JSON.stringify(error));
    }
  }

  /* ------------------ Host Change Detection ------------------ */

  private detectHostChange(newList: any[]): void {

    const newHost = newList.find(p => Number(p.role) === 1);
    const oldHost = this.previousParticipantsRaw.find(p => Number(p.role) === 1);

    if (newHost) {

      if (!oldHost) {
        this.log(`👑 Host detected: ${this.getName(newHost)}`);
      }

      if (
        oldHost &&
        newHost.participantUUID !== oldHost.participantUUID
      ) {
        this.log(`🔥 HOST TRANSFER DETECTED → ${this.getName(newHost)}`);
      }

      this.currentHostUUID = newHost.participantUUID;
    }
  }

  /* ------------------ Helpers ------------------ */

  getRole(role: number): string {
    if (role === 1) return 'Host';
    if (role === 2) return 'Co-Host';
    return 'Participant';
  }

  isHost(role: number): boolean {
    return role === 1;
  }

  private getName(p: any): string {
    return p.screenName || p.displayName || p.userName || 'Unknown';
  }

}