export class PixelStreamingInput {
    private videoElement: HTMLVideoElement;
    private sendDataMessage: (data: object) => void;

    constructor(videoElement: HTMLVideoElement, sendDataMessage: (data: object) => void) {
        this.videoElement = videoElement;
        this.sendDataMessage = sendDataMessage;
    }

    /**
     * Normalizes mouse/touch coordinates to 0.0 - 1.0 range
     */
    private normalizeCoordinates(clientX: number, clientY: number) {
        const rect = this.videoElement.getBoundingClientRect();
        const x = (clientX - rect.left) / rect.width;
        const y = (clientY - rect.top) / rect.height;
        return { x, y };
    }

    /**
     * Handles a click or tap event and sends it to Unreal
     */
    public handleInteraction(clientX: number, clientY: number) {
        const { x, y } = this.normalizeCoordinates(clientX, clientY);

        // Construct the payload for Unreal
        const payload = {
            type: "interaction",
            event: "click",
            data: {
                x,
                y
            }
        };

        console.log("Sending interaction to Unreal:", payload);
        this.sendDataMessage(payload);
    }

    /**
     * Attach event listeners to the video element (optional helper)
     */
    public attachListeners() {
        this.videoElement.addEventListener('click', (e) => {
            this.handleInteraction(e.clientX, e.clientY);
        });

        this.videoElement.addEventListener('touchend', (e) => {
            // Prevent phantom mouse clicks if needed
            // e.preventDefault(); 
            const touch = e.changedTouches[0];
            this.handleInteraction(touch.clientX, touch.clientY);
        });
    }
}
