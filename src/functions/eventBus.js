class EventBus {
  constructor() {
    if (typeof document !== 'undefined') {
      this.eventTarget = document.createElement('div');
    }
  }

  on(event, callback) {
    if (this.eventTarget) {
      this.eventTarget.addEventListener(event, callback);
    }
  }

  off(event, callback) {
    if (this.eventTarget) {
      this.eventTarget.removeEventListener(event, callback);
    }
  }

  emit(event, detail = {}) {
    if (this.eventTarget) {
      this.eventTarget.dispatchEvent(new CustomEvent(event, { detail }));
    }
  }
}

export default new EventBus();