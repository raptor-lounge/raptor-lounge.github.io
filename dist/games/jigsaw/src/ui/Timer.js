/**
 * Timer.js - Performance & Time Tracking Module
 * 
 * Part of PlayJigsaw.net Open Source Engine (https://playjigsaw.net/)
 */

export class GameTimer {
  constructor(displayElement) {
    this.displayElement = displayElement;
    this.timerId = null;
    this.seconds = 0;
  }

  start() {
    this.stop();
    this.seconds = 0;
    this.updateDisplay();
    this.timerId = setInterval(() => {
      this.seconds++;
      this.updateDisplay();
    }, 1000);
  }

  stop() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  getFormattedTime() {
    const mins = String(Math.floor(this.seconds / 60)).padStart(2, '0');
    const secs = String(this.seconds % 60).padStart(2, '0');
    return `${mins}:${secs}`;
  }

  updateDisplay() {
    if (this.displayElement) {
      this.displayElement.textContent = this.getFormattedTime();
    }
  }
}
