import { Component, OnInit } from '@angular/core';
import zoomSdk from '@zoom/appssdk';

@Component({
  selector: 'app-meeting-participants-hostchange',
  templateUrl: './meeting-participants-hostchange.component.html',
  styleUrls: ['./meeting-participants-hostchange.component.css']
})
export class MeetingParticipantsHostchangeComponent implements OnInit {

 participants: any[] = [];
  logs: string[] = [];
  currentHostUUID: string | null = null;

  async ngOnInit() {
    await this.initializeZoom();
  }

  log(message: string) {
    const time = new Date().toLocaleTimeString();
    this.logs.push(`[${time}] ${message}`);
  }

  async initializeZoom() {
    try {
      await zoomSdk.config({
       capabilities: [
  'getMeetingParticipants',
  'onParticipantChange'
]
      });

      this.log('Zoom SDK configured successfully');

      await this.loadParticipants();

      zoomSdk.onParticipantChange(async () => {
  this.log('Participant change detected');
  await this.loadParticipants();
});

    } catch (error: any) {
      this.log('SDK Init Error: ' + JSON.stringify(error));
    }
  }

  async loadParticipants() {
    try {
      const response = await zoomSdk.getMeetingParticipants();
      this.participants = response.participants;

      const host = this.participants.find(p => p.role === 1);

      if (host) {
        if (this.currentHostUUID && this.currentHostUUID !== host.participantUUID) {
          this.log('Host changed to: ' + host.displayName);
        }
        this.currentHostUUID = host.participantUUID;
      }

      this.log('Participants list updated');

    } catch (error: any) {
      this.log('Error fetching participants: ' + JSON.stringify(error));
    }
  }

  getRole(role: number): string {
    if (role === 1) return 'Host';
    if (role === 2) return 'Co-Host';
    return 'Participant';
  }

}