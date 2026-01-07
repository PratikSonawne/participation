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

  participants: Participant[] = [];
  private participantMap = new Map<string, Participant>();

  // keep handler reference (IMPORTANT for off())
  private participantChangeHandler = (event: any) => {
    this.handleParticipantChange(event);
  };

  async ngOnInit() {
    await this.initZoomSdk();
    await this.loadInitialParticipants();
    this.registerRealtimeEvents();
  }

  ngOnDestroy() {
    zoomSdk.off('onParticipantChange', this.participantChangeHandler);
  }

  // 🔹 STEP 1: Init SDK
  async initZoomSdk() {
    try {
      await zoomSdk.config({
        capabilities: [
          'getMeetingParticipants',
          'onParticipantChange'
        ]
      });

      console.log('✅ Zoom SDK initialized');
    } catch (e) {
      console.error('❌ Zoom SDK init failed', e);
    }
  }

  // 🔹 STEP 2: Load initial participants
  async loadInitialParticipants() {
    const res = await zoomSdk.getMeetingParticipants();
    const now = new Date().toISOString();

    this.participantMap.clear();

    res.participants.forEach((p: any) => {
      this.participantMap.set(p.participantId, {
        participantId: p.participantId,
        userName: p.userName,
        joinTime: now
      });
    });

    this.refreshList();
  }

  // 🔹 STEP 3: Register realtime updates
  registerRealtimeEvents() {
    zoomSdk.on('onParticipantChange', this.participantChangeHandler);
  }

  // 🔹 STEP 4: Handle participant change (JOIN / LEAVE detection)
  private handleParticipantChange(event: any) {
    const now = new Date().toISOString();
    const currentIds = new Set<string>();

    event.participants.forEach((p: any) => {
      currentIds.add(p.participantId);

      // JOIN
      if (!this.participantMap.has(p.participantId)) {
        this.participantMap.set(p.participantId, {
          participantId: p.participantId,
          userName: p.userName,
          joinTime: now
        });
      }
    });

    // LEAVE
    this.participantMap.forEach((value, key) => {
      if (!currentIds.has(key) && !value.leaveTime) {
        value.leaveTime = now;
      }
    });

    this.refreshList();
  }

  // 🔹 Refresh UI list
  private refreshList() {
    this.participants = Array.from(this.participantMap.values());
  }
}



// import { Component, OnDestroy, OnInit } from '@angular/core';
// import { RealtimeService } from '../realtime.service';

// @Component({
//   selector: 'app-participants-component',
//   templateUrl: './participants-component.component.html',
//   styleUrls: ['./participants-component.component.css']
// })
// export class ParticipantsComponentComponent implements OnInit, OnDestroy {
//   meetingId = '';
//   participants: string[] = [];

//   constructor(private realtime: RealtimeService) {}

//   ngOnInit(): void {
//     this.realtime.connect((data) => {
//       this.meetingId = data.meetingId;
//       this.participants = data.participants || [];
//     });
//   }

//   ngOnDestroy(): void {
//     this.realtime.disconnect();
//   }
// }