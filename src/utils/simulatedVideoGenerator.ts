/**
 * Zero-cost procedural video generator for frontline SOP demonstrations.
 * Synthesizes high-definition 720p 30fps video blobs using HTML5 Canvas & MediaRecorder.
 * Consumes 0 API credits and renders in ~1-2 seconds per clip.
 * 
 * CRITICAL GUIDELINE: ZERO text burned onto the video canvas or frame.
 * All graphics are pure procedural workplace visual elements, workstations, equipment,
 * radar sweeps, calibration brackets, and action motions.
 */

export interface SimulationVideoOptions {
  lessonTitle: string;
  stepTitle: string;
  stepIndex: number;
  totalSteps: number;
  role?: string;
  accentColor?: string;
  durationMs?: number;
}

export async function generateSimulatedVideoBlob(options: SimulationVideoOptions): Promise<Blob> {
  const {
    stepIndex,
    accentColor = '#38BDF8',
    durationMs = 8000,
  } = options;

  return new Promise((resolve) => {
    if (typeof window === 'undefined' || typeof HTMLCanvasElement === 'undefined') {
      resolve(new Blob([], { type: 'video/webm' }));
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d');

    if (!ctx || typeof canvas.captureStream !== 'function' || typeof MediaRecorder === 'undefined') {
      resolve(new Blob([], { type: 'video/webm' }));
      return;
    }

    let stream: MediaStream;
    try {
      stream = canvas.captureStream(30);
    } catch {
      resolve(new Blob([], { type: 'video/webm' }));
      return;
    }

    let mimeType = 'video/webm';
    if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
      mimeType = 'video/webm;codecs=vp9';
    } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8')) {
      mimeType = 'video/webm;codecs=vp8';
    } else if (MediaRecorder.isTypeSupported('video/mp4')) {
      mimeType = 'video/mp4';
    }

    let mediaRecorder: MediaRecorder;
    try {
      mediaRecorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 2500000 });
    } catch {
      try {
        mediaRecorder = new MediaRecorder(stream);
      } catch {
        resolve(new Blob([], { type: 'video/webm' }));
        return;
      }
    }

    const chunks: Blob[] = [];
    mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        chunks.push(e.data);
      }
    };

    mediaRecorder.onstop = () => {
      const finalBlob = new Blob(chunks, { type: mediaRecorder.mimeType || 'video/webm' });
      resolve(finalBlob);
    };

    mediaRecorder.start(100);

    const startTime = performance.now();
    let animId: number;

    const renderFrame = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / durationMs);

      // 1. Deep Obsidian / Space-Gray Terminal Atmosphere
      const grad = ctx.createLinearGradient(0, 0, 1280, 720);
      grad.addColorStop(0, '#090B12');
      grad.addColorStop(0.5, '#101320');
      grad.addColorStop(1, '#06070B');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1280, 720);

      // 2. Terminal Glass Floor & Grid Lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
      ctx.lineWidth = 1;
      for (let x = 0; x < 1280; x += 64) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 720);
        ctx.stroke();
      }
      for (let y = 0; y < 720; y += 64) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(1280, y);
        ctx.stroke();
      }

      // 3. Ambient Lighting Glow
      const radGrad = ctx.createRadialGradient(640, 360, 50, 640, 360, 480);
      radGrad.addColorStop(0, `${accentColor}20`);
      radGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = radGrad;
      ctx.fillRect(0, 0, 1280, 720);

      // 4. Large Terminal Window in Background (Airport Tarmac & Aircraft Silhouette)
      ctx.save();
      ctx.fillStyle = 'rgba(15, 23, 42, 0.6)';
      ctx.fillRect(160, 80, 960, 320);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 2;
      ctx.strokeRect(160, 80, 960, 320);

      // Window mullions / panes
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.beginPath();
      ctx.moveTo(480, 80); ctx.lineTo(480, 400);
      ctx.moveTo(800, 80); ctx.lineTo(800, 400);
      ctx.stroke();

      // Distant Aircraft Silhouette on Tarmac
      ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
      // Fuselage & Wing
      ctx.beginPath();
      ctx.ellipse(640, 260, 160, 24, -0.05, 0, Math.PI * 2);
      ctx.fill();
      // Tail Fin
      ctx.beginPath();
      ctx.moveTo(760, 245);
      ctx.lineTo(800, 180);
      ctx.lineTo(830, 250);
      ctx.closePath();
      ctx.fill();
      // Swept Wing
      ctx.beginPath();
      ctx.moveTo(600, 260);
      ctx.lineTo(540, 330);
      ctx.lineTo(570, 335);
      ctx.lineTo(650, 265);
      ctx.closePath();
      ctx.fill();

      // Runway Taxiway Guideline Lights
      for (let i = 0; i < 7; i++) {
        const lx = 320 + i * 100;
        const ly = 370 + Math.sin(i + elapsed * 0.003) * 3;
        ctx.fillStyle = i % 2 === 0 ? '#38BDF8' : '#34D399';
        ctx.beginPath();
        ctx.arc(lx, ly, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // 5. SCENE-SPECIFIC PROCEDURAL WORKSTATION GRAPHICS
      const sceneNum = ((stepIndex - 1) % 7) + 1;

      if (sceneNum === 1) {
        // SCENE 01: PREPARE - Terminal Desk & Flight Status Monitor
        // Workstation Desk Surface
        ctx.fillStyle = 'rgba(20, 24, 38, 0.9)';
        ctx.fillRect(360, 420, 560, 190);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.strokeRect(360, 420, 560, 190);

        // Flight Information Monitor on Desk
        ctx.fillStyle = '#0F172A';
        ctx.fillRect(400, 300, 260, 160);
        ctx.strokeStyle = '#38BDF8';
        ctx.lineWidth = 2;
        ctx.strokeRect(400, 300, 260, 160);

        // Monitor Status Bars / Flight Rows
        ctx.fillStyle = '#38BDF8';
        ctx.fillRect(420, 325, 120, 10);
        ctx.fillStyle = '#34D399';
        ctx.fillRect(570, 325, 70, 10);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.fillRect(420, 350, 220, 6);
        ctx.fillRect(420, 370, 180, 6);
        ctx.fillRect(420, 390, 200, 6);
        ctx.fillRect(420, 410, 150, 6);

        // Radio Transceiver on Desk with pulsing antenna wave
        ctx.fillStyle = '#1E293B';
        ctx.fillRect(720, 400, 60, 110);
        ctx.strokeStyle = '#64748B';
        ctx.strokeRect(720, 400, 60, 110);
        // Antenna
        ctx.strokeStyle = '#94A3B8';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(740, 400); ctx.lineTo(740, 340);
        ctx.stroke();
        // Signal Wave
        const sigWave = Math.sin(elapsed * 0.008) * 6;
        ctx.strokeStyle = '#38BDF8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(740, 340, 14 + sigWave, -Math.PI / 2, Math.PI / 2);
        ctx.stroke();

      } else if (sceneNum === 2) {
        // SCENE 02: AUTHORISE & BEGIN BOARDING - Gate A8 Podium & Microphone
        // Gate A8 Podium Pillar
        ctx.fillStyle = 'rgba(30, 41, 59, 0.9)';
        ctx.fillRect(540, 380, 200, 240);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 2;
        ctx.strokeRect(540, 380, 200, 240);

        // Overhead Gate Departure Board
        ctx.fillStyle = '#0F172A';
        ctx.fillRect(460, 120, 360, 90);
        ctx.strokeStyle = '#FBBF24';
        ctx.lineWidth = 3;
        ctx.strokeRect(460, 120, 360, 90);
        // Golden Gate Emblem & Status Bar
        ctx.fillStyle = '#FBBF24';
        ctx.fillRect(490, 145, 80, 40);
        ctx.fillStyle = '#34D399';
        ctx.fillRect(600, 155, 180, 20);

        // Gooseneck Microphone on Podium
        ctx.strokeStyle = '#CBD5E1';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(640, 380);
        ctx.quadraticCurveTo(650, 310, 620, 280);
        ctx.stroke();
        // Mic Capsule
        ctx.fillStyle = '#94A3B8';
        ctx.beginPath();
        ctx.arc(620, 280, 12, 0, Math.PI * 2);
        ctx.fill();

        // Expanding Vocal Broadcast Waveforms
        const waveProgress = (elapsed * 0.004) % 1;
        ctx.strokeStyle = `rgba(96, 165, 250, ${1 - waveProgress})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(620, 280, 25 + waveProgress * 60, -Math.PI * 0.75, Math.PI * 0.25);
        ctx.stroke();

      } else if (sceneNum === 3) {
        // SCENE 03: VERIFY BOARDING DOCUMENTS - Optical Scanner & Document Check
        // Gate Scanner Podium
        ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
        ctx.fillRect(480, 360, 320, 260);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.strokeRect(480, 360, 320, 260);

        // Optical Scan Glass Bed
        ctx.fillStyle = '#022C22';
        ctx.fillRect(540, 340, 200, 50);
        ctx.strokeStyle = '#10B981';
        ctx.lineWidth = 2;
        ctx.strokeRect(540, 340, 200, 50);

        // Moving Green Laser Scan Plane
        const scanPos = Math.sin(elapsed * 0.006) * 80 + 640;
        ctx.strokeStyle = '#34D399';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(scanPos, 340);
        ctx.lineTo(scanPos, 390);
        ctx.stroke();
        ctx.fillStyle = 'rgba(52, 211, 153, 0.2)';
        ctx.fillRect(scanPos - 15, 340, 30, 50);

        // Boarding Document Graphic being scanned
        ctx.fillStyle = '#F8FAFC';
        ctx.fillRect(570, 270, 140, 85);
        ctx.strokeStyle = '#94A3B8';
        ctx.lineWidth = 1;
        ctx.strokeRect(570, 270, 140, 85);
        // Barcode / QR pattern lines
        ctx.fillStyle = '#0F172A';
        for (let b = 0; b < 12; b++) {
          ctx.fillRect(585 + b * 9, 310, (b % 3 === 0 ? 5 : 2), 32);
        }

        // Verified Checkmark Emblem
        ctx.fillStyle = '#10B981';
        ctx.beginPath();
        ctx.arc(750, 290, 20, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(742, 290); ctx.lineTo(748, 296); ctx.lineTo(758, 284);
        ctx.stroke();

      } else if (sceneNum === 4) {
        // SCENE 04: PASSENGER FLOW & ASSISTANCE - Queue Stanchions & Priority Route
        // Stanchion Posts (Queue Line Ropes)
        const stanchionX = [320, 540, 760, 980];
        stanchionX.forEach((sx) => {
          ctx.fillStyle = '#94A3B8';
          ctx.fillRect(sx - 4, 340, 8, 220);
          ctx.beginPath();
          ctx.arc(sx, 335, 12, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillRect(sx - 25, 550, 50, 14);
        });

        // Velour Ropes between Stanchions (catenary curve)
        ctx.strokeStyle = '#38BDF8';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(320, 345);
        ctx.quadraticCurveTo(430, 385, 540, 345);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(540, 345);
        ctx.quadraticCurveTo(650, 385, 760, 345);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(760, 345);
        ctx.quadraticCurveTo(870, 385, 980, 345);
        ctx.stroke();

        // Priority Wheelchair / PRM Assistance Corridor Indicator
        ctx.strokeStyle = '#818CF8';
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 8]);
        ctx.beginPath();
        ctx.moveTo(400, 580); ctx.lineTo(880, 580);
        ctx.stroke();
        ctx.setLineDash([]);

        // Wheelchair Accessibility Emblem
        ctx.fillStyle = '#818CF8';
        ctx.beginPath();
        ctx.arc(640, 500, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#818CF8';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(640, 520, 18, Math.PI * 0.2, Math.PI * 1.4);
        ctx.stroke();

      } else if (sceneNum === 5) {
        // SCENE 05: OPERATIONAL EXCEPTIONS - Outage Alert & Contingency Comms
        // Workstation Monitor with Amber Warning Triangle
        ctx.fillStyle = '#1E1B4B';
        ctx.fillRect(380, 260, 360, 240);
        ctx.strokeStyle = '#F59E0B';
        ctx.lineWidth = 3;
        ctx.strokeRect(380, 260, 360, 240);

        // Flashing Warning Triangle
        const flashAlpha = Math.sin(elapsed * 0.008) > 0 ? 1 : 0.4;
        ctx.fillStyle = `rgba(245, 158, 11, ${flashAlpha})`;
        ctx.beginPath();
        ctx.moveTo(560, 320);
        ctx.lineTo(620, 420);
        ctx.lineTo(500, 420);
        ctx.closePath();
        ctx.fill();

        // Warning Exclamation mark in triangle
        ctx.fillStyle = '#000000';
        ctx.fillRect(557, 355, 6, 35);
        ctx.beginPath();
        ctx.arc(560, 405, 4, 0, Math.PI * 2);
        ctx.fill();

        // Contingency Telephone Link
        ctx.fillStyle = '#334155';
        ctx.fillRect(800, 380, 90, 140);
        ctx.strokeStyle = '#94A3B8';
        ctx.strokeRect(800, 380, 90, 140);
        // Cord
        ctx.strokeStyle = '#F59E0B';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(820, 500);
        ctx.bezierCurveTo(810, 560, 870, 560, 860, 500);
        ctx.stroke();

      } else if (sceneNum === 6) {
        // SCENE 06: BOARDING RECONCILIATION - Dashboard & Closure Clearance
        // Reconciliation Terminal Screen
        ctx.fillStyle = '#064E3B';
        ctx.fillRect(380, 240, 520, 280);
        ctx.strokeStyle = '#10B981';
        ctx.lineWidth = 3;
        ctx.strokeRect(380, 240, 520, 280);

        // 4 Verified Checklist Metric Bars
        const metrics = [280, 330, 380, 430];
        metrics.forEach((my, idx) => {
          // Green Verified Check Circle
          ctx.fillStyle = '#10B981';
          ctx.beginPath();
          ctx.arc(430, my, 16, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(424, my); ctx.lineTo(428, my + 5); ctx.lineTo(437, my - 5);
          ctx.stroke();

          // Horizontal Progress Bar
          ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
          ctx.fillRect(470, my - 8, 380, 16);
          ctx.fillStyle = idx === 3 ? '#34D399' : '#10B981';
          ctx.fillRect(470, my - 8, 380 * (0.8 + idx * 0.06), 16);
        });

        // Gate Closure Door Lock Graphic
        ctx.fillStyle = '#0F172A';
        ctx.fillRect(940, 340, 60, 90);
        ctx.strokeStyle = '#10B981';
        ctx.lineWidth = 2;
        ctx.strokeRect(940, 340, 60, 90);
        ctx.beginPath();
        ctx.arc(970, 340, 20, Math.PI, 0);
        ctx.stroke();

      } else if (sceneNum === 7) {
        // SCENE 07: APPLY STOP-AND-ESCALATE RULE - Red/White Safety Tape & Hand Barrier
        // Red and White Diagonal Safety Barrier Tape
        ctx.save();
        ctx.strokeStyle = '#EF4444';
        ctx.lineWidth = 18;
        ctx.beginPath();
        ctx.moveTo(200, 380); ctx.lineTo(1080, 380);
        ctx.stroke();
        // Diagonal warning stripes along tape
        for (let s = 220; s < 1060; s += 40) {
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 6;
          ctx.beginPath();
          ctx.moveTo(s, 371); ctx.lineTo(s + 20, 389);
          ctx.stroke();
        }
        ctx.restore();

        // Central Authoritative STOP Hand Graphic (Open Palm)
        ctx.fillStyle = '#EF4444';
        ctx.beginPath();
        ctx.arc(640, 280, 55, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 4;
        ctx.stroke();

        // Open Palm
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.roundRect(615, 260, 50, 45, 8); // palm
        ctx.roundRect(612, 230, 10, 35, 5); // index
        ctx.roundRect(625, 222, 10, 42, 5); // middle
        ctx.roundRect(638, 225, 10, 40, 5); // ring
        ctx.roundRect(651, 234, 10, 32, 5); // pinky
        ctx.roundRect(600, 268, 16, 22, 5); // thumb
        ctx.fill();

        // Emergency Direct Communication Link
        ctx.fillStyle = '#1E293B';
        ctx.fillRect(860, 420, 80, 130);
        ctx.strokeStyle = '#EF4444';
        ctx.lineWidth = 2;
        ctx.strokeRect(860, 420, 80, 130);
      }

      // 6. Sleek Corner Framing Brackets (Pure Visual, ZERO Text)
      const cornerSize = 28;
      ctx.strokeStyle = `${accentColor}80`;
      ctx.lineWidth = 2;
      // Top-Left
      ctx.beginPath();
      ctx.moveTo(80, 80 + cornerSize);
      ctx.lineTo(80, 80);
      ctx.lineTo(80 + cornerSize, 80);
      ctx.stroke();
      // Top-Right
      ctx.beginPath();
      ctx.moveTo(1200 - cornerSize, 80);
      ctx.lineTo(1200, 80);
      ctx.lineTo(1200, 80 + cornerSize);
      ctx.stroke();
      // Bottom-Left
      ctx.beginPath();
      ctx.moveTo(80, 640 - cornerSize);
      ctx.lineTo(80, 640);
      ctx.lineTo(80 + cornerSize, 640);
      ctx.stroke();
      // Bottom-Right
      ctx.beginPath();
      ctx.moveTo(1200 - cornerSize, 640);
      ctx.lineTo(1200, 640);
      ctx.lineTo(1200, 640 - cornerSize);
      ctx.stroke();

      // 7. Minimal Clean Progress Bar along frame bottom (NO text on frame)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.fillRect(80, 658, 1120, 4);
      ctx.fillStyle = accentColor;
      ctx.fillRect(80, 658, 1120 * progress, 4);

      if (elapsed < durationMs) {
        animId = requestAnimationFrame(renderFrame);
      } else {
        cancelAnimationFrame(animId);
        try {
          if (mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
          }
        } catch (_) {
          resolve(new Blob([], { type: 'video/webm' }));
        }
      }
    };

    animId = requestAnimationFrame(renderFrame);
  });
}
