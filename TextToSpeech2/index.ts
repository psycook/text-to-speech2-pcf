import { IInputs, IOutputs } from "./generated/ManifestTypes";
import * as SpeechSDK from 'microsoft-cognitiveservices-speech-sdk';

export class TextToSpeech2 implements ComponentFramework.StandardControl<IInputs, IOutputs> {

    // state attributes
    private _context: ComponentFramework.Context<IInputs>;
    private _isInitialised: boolean = false;
    private _notifyOutputChanged: () => void;

    // property attributes
    private _text: string = "";
    private _state: string = "waiting";
    private _subscriptionKey: string;
    private _region: string;
    private _language: string;
    private _voice: string = "en-US-ChristopherNeural";
    private _autoSpeak: boolean = false;
    private _stroke: string = "white";
    private _width: number = 0;
    private _height: number = 0;

    // ui attributes
    private _container: HTMLDivElement;
    private _buttonDiv: HTMLDivElement;

    // player attribute
    private _player: SpeechSDK.SpeakerAudioDestination;
    private _audio: HTMLAudioElement | null;

    /**
     * Empty constructor.
     */
    constructor() {
    }

    public init(context: ComponentFramework.Context<IInputs>, notifyOutputChanged: () => void, state: ComponentFramework.Dictionary, container: HTMLDivElement): void {
        // Add control initialization code
        this._context = context;
        this._context.mode.trackContainerResize(true);
        this._container = container;
        this._notifyOutputChanged = notifyOutputChanged;
    }

    public updateView(context: ComponentFramework.Context<IInputs>): void {
        //has anything changed?  If not, bug out
        if (this._text === context.parameters.text.raw &&
            this._state === context.parameters.state.raw &&
            this._subscriptionKey === context.parameters.subscriptionKey.raw &&
            this._region === context.parameters.region.raw &&
            this._language === context.parameters.language.raw &&
            this._voice === context.parameters.voice.raw &&
            this._stroke === context.parameters.stroke.raw &&
            this._autoSpeak === context.parameters.autoSpeak.raw &&
            this._width === context.mode.allocatedWidth &&
            this._height === context.mode.allocatedHeight) {
            return;
        }

        // update the properties
        this._text = context.parameters.text.raw as string;
        this._state = context.parameters.state.raw as string;
        this._subscriptionKey = context.parameters.subscriptionKey.raw as string;
        this._region = context.parameters.region.raw as string;
        this._language = context.parameters.language.raw as string;
        this._voice = context.parameters.voice.raw as string;
        this._autoSpeak = context.parameters.autoSpeak.raw as boolean;
        this._stroke = context.parameters.stroke.raw as string;
        this._width = context.mode.allocatedWidth;
        this._height = context.mode.allocatedHeight;

        // Add code to update control view
        if (!this._isInitialised) {
            // create the translation div & button
            this._buttonDiv = document.createElement("div");
            this._buttonDiv.id = `button-div`;
            this._buttonDiv.className = `button-div`;
            this._buttonDiv.style.width = `100%`;
            this._buttonDiv.style.height = `100%`;
            this._buttonDiv.style.cursor = `pointer`;
            this.setPlayButton();
            this._buttonDiv.addEventListener('click', this.buttonPressed.bind(this));
            this._container.appendChild(this._buttonDiv);
            this._isInitialised = true;
        } else {
            switch (this._state) {
                case "speaking":
                    this.setStopButton();
                    break;
                case "loading":
                    this.setAnimatedButton();
                    break;
                default:
                    this.setPlayButton();
            }
        }
        if (this._autoSpeak) this.buttonPressed();
    }

    public getOutputs(): IOutputs {
        return {
            "state": this._state,
            "autoSpeak": this._autoSpeak
        };
    }

    public destroy(): void {
        // Add code to cleanup control if necessary
    }


    public buttonPressed(): void {
        // check that we have text and are not already speaking
        if (this._text === "") {
            return;
        }

        // check if we are loading
        if (this._state === "loading") {
            return;
        }

        // check if we are already speaking
        if (this._state === "speaking") {
            //pause the audio  
            if(this._audio)
            {
                this._audio.pause();
                this._audio = null;
            }
            this._state = "idle";
            this._notifyOutputChanged();
            this.setPlayButton();
            return;
        }

        // set state to loading
        this._state = "loading";
        this._autoSpeak = false;
        this._notifyOutputChanged();
        this.setAnimatedButton();

        // //use the speech sdk to synthesize the text
        // this._player = new SpeechSDK.SpeakerAudioDestination();
        // const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(this._subscriptionKey, this._region);
        // const audioConfig = SpeechSDK.AudioConfig.fromSpeakerOutput(this._player);

        // // configure the speech synthesis
        // speechConfig.speechSynthesisVoiceName = this._voice;
        // speechConfig.speechSynthesisLanguage = this._language;
        // speechConfig.speechSynthesisOutputFormat = SpeechSDK.SpeechSynthesisOutputFormat.Audio16Khz64KBitRateMonoMp3;

        // // create the synthesizer with an undefined audioConfig
        // const synthesizer = new SpeechSDK.SpeechSynthesizer(speechConfig, audioConfig);

        // console.log(`Created synthesizer with properties: ${JSON.stringify(synthesizer.properties)}`);
        // console.log(`Created speech config; ${JSON.stringify(speechConfig)}`);
        // console.log(`Created player: ${JSON.stringify(this._player)}`);

        // synthesizer.speakTextAsync(
        //     this._text,
        //     (result: SpeechSDK.SpeechSynthesisResult) => {
        //         console.log(`Speak text success: ${JSON.stringify(result.reason)}`);
        //         synthesizer.close();
        //     }
        // );

        // this._player.onAudioStart = () => {
        //     console.log("audio started");
        //     this._state = "speaking";
        //     this._notifyOutputChanged()
        //     this.setStopButton();
        // };

        // this._player.onAudioEnd = () => {
        //     console.log("audio ended");
        //     this.setPlayButton();
        //     this._state = "idle";
        //     this._notifyOutputChanged();
        // };

        console.log(`Creating the audio element`);

        // create the async function
        const restAction = async () => {
            const response = await fetch(`https://${this._region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
                method : "post",
                headers: {
                    "Ocp-Apim-Subscription-Key":`${this._subscriptionKey}`,
                    "X-Microsoft-OutputFormat": "riff-24khz-16bit-mono-pcm",
                    "Content-Type": "application/ssml+xml"
                },
                body: `<speak version='1.0' xml:lang='${this._language}'><voice xml:lang='${this._language}' xml:gender='Male' name='${this._voice}'>${this._text}</voice></speak>`
            }
            ).then(result => result.blob()
            ).then(blob => {
                // change to stop button
                this._state = "speaking";
                this._notifyOutputChanged();
                this.setStopButton();
                const audioURL = URL.createObjectURL(blob);
                this._audio = new Audio(audioURL);
                this._audio.onended = () => {
                    this._state = "idle"; 
                    this._notifyOutputChanged();
                    this.setPlayButton();
                }
                this._audio.play();
            });
        }

        // do it
        restAction();
    }

    public setPlayButton() {
        this._buttonDiv.innerHTML = `<svg width="${this._context.mode.allocatedWidth}" height="${this._context.mode.allocatedHeight}" viewBox="0 0 800 800" fill="none" xmlns="http://www.w3.org/2000/svg"> <circle cx="400" cy="400" r="294" stroke="${this._stroke}" stroke-width="12"/> <path d="M550 400L325 529.904V270.096L550 400Z" fill="${this._stroke}"/> </svg>`;

        // this._buttonDiv.innerHTML = `<svg width="${this._context.mode.allocatedWidth}" height="${this._context.mode.allocatedHeight}" viewBox="0 0 1024 1024" fill="none" xmlns="http://www.w3.org/2000/svg"><g clip-path="url(#clip0_626_2)"><circle cx="512" cy="512" r="448" fill="${this._playColor}"/><circle cx="512" cy="512" r="480" stroke="${this._playColor}" stroke-opacity="0.5" stroke-width="64"/><path d="M768 456.574C810.667 481.208 810.667 542.792 768 567.426L432 761.415C389.333 786.049 336 755.257 336 705.99V318.01C336 268.743 389.333 237.951 432 262.585L768 456.574Z" fill="white"/></g><defs><clipPath id="clip0_626_2"><rect width="1024" height="1024" fill="white"/></clipPath></defs></svg>`;
    }

    public setStopButton() {
        this._buttonDiv.innerHTML = `<svg width="${this._context.mode.allocatedWidth}" height="${this._context.mode.allocatedHeight}" viewBox="0 0 800 800" fill="none" xmlns="http://www.w3.org/2000/svg"> <circle cx="400" cy="400" r="294" stroke="${this._stroke}" stroke-width="12"/> <rect x="275" y="275" width="250" height="250" fill="${this._stroke}"/> </svg> `;

        //this._buttonDiv.innerHTML = `<svg width="${this._context.mode.allocatedWidth}" height="${this._context.mode.allocatedHeight}" viewBox="0 0 1024 1024" fill="none" xmlns="http://www.w3.org/2000/svg"><g clip-path="url(#clip0_236_16)"><circle cx="512" cy="512" r="448" fill="${this._stroke}"/><circle cx="512" cy="512" r="480" stroke="${this._stroke}" stroke-opacity="0.5" stroke-width="64"/><rect x="256" y="256" width="512" height="512" rx="64" fill="white"/></g><defs><clipPath id="clip0_236_16"><rect width="1024" height="1024" fill="white"/></clipPath></defs></svg>`;
    }

    public setAnimatedButton() {
        this._buttonDiv.innerHTML = `<svg width="${this._context.mode.allocatedWidth}" height="${this._context.mode.allocatedHeight}" viewBox="0 0 800 800" fill="none" xmlns="http://www.w3.org/2000/svg"> <g> <path d="M400 700C234.315 700 100 565.685 100 400" stroke="${this._stroke}" stroke-width="12"/> <animateTransform attributeType='xml' attributeName='transform' type='rotate' from='0 400 400' to='360 400 400' dur='2s' additive='sum' repeatCount='indefinite' /> </g> </svg>`;
    }
}