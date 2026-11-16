/** Moves a point in a straight line over some time. It can be paused, and it can be stopped, which cancels it for good. */
export class MoveAnimation {
    /** Resolves when the point has arrived. Never resolves when the animation was stopped. */
    readonly finished: Promise<void>;

    #resolve!: () => void;
    #from: { x: number; y: number };
    #elapsed = 0;
    #last = 0;
    #frame = 0;
    #playing = false;
    #stopped = false;

    constructor(
        private readonly target: { x: number; y: number },
        private readonly to: { x: number; y: number },
        private readonly duration: number,
        private readonly changed: () => void
    ) {
        this.#from = { x: target.x, y: target.y };
        this.finished = new Promise((resolve) => (this.#resolve = resolve));
    }

    get playing(): boolean {
        return this.#playing;
    }

    play(): this {
        if (this.#stopped || this.#playing) return this;
        this.#playing = true;
        this.#last = performance.now();
        this.#frame = requestAnimationFrame(this.#step);
        return this;
    }

    pause(): void {
        this.#playing = false;
        cancelAnimationFrame(this.#frame);
    }

    stop(): void {
        this.#stopped = true;
        this.pause();
    }

    #step = (now: number) => {
        if (!this.#playing) return;
        this.#elapsed += now - this.#last;
        this.#last = now;
        const progress = this.duration > 0 ? Math.min(1, this.#elapsed / this.duration) : 1;
        this.target.x = this.#from.x + (this.to.x - this.#from.x) * progress;
        this.target.y = this.#from.y + (this.to.y - this.#from.y) * progress;
        this.changed();
        if (progress < 1) {
            this.#frame = requestAnimationFrame(this.#step);
        } else {
            this.#playing = false;
            this.#resolve();
        }
    };
}
