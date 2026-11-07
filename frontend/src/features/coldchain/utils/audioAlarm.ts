class AlarmAudioManager {
  private audioCtx: AudioContext | null = null;
  private intervalId: number | null = null;
  private isMuted: boolean = false;

  private initContext() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioContextClass();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  // Phát một xung âm thanh cảnh báo tần số cao (Beep Beep)
  private playBeep() {
    if (this.isMuted) return;
    try {
      this.initContext();
      if (!this.audioCtx) return;

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sawtooth';
      // Tần số âm thanh còi báo động khẩn cấp 950Hz -> 1200Hz
      osc.frequency.setValueAtTime(950, this.audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1250, this.audioCtx.currentTime + 0.15);

      gain.gain.setValueAtTime(0.2, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.25);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.25);
    } catch {
      // Trình duyệt có thể chặn autoplay nếu user chưa tương tác click
    }
  }

  // Bắt đầu còi hú lặp lại mỗi 800ms
  public startAlarm() {
    if (this.intervalId !== null) return;
    this.playBeep();
    this.intervalId = window.setInterval(() => {
      this.playBeep();
    }, 800);
  }

  // Dừng còi hú khi nhiệt độ hạ xuống bình thường
  public stopAlarm() {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted) {
      this.stopAlarm();
    }
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }
}

export const alarmAudio = new AlarmAudioManager();