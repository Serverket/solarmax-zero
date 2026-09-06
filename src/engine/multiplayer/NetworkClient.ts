export type ConnectionState = 'new' | 'connecting' | 'connected' | 'disconnected' | 'failed';

export class NetworkClient {
  public peerConnection: RTCPeerConnection;
  public dataChannel?: RTCDataChannel;
  public state: ConnectionState = 'new';
  public targetPeerId: string;
  
  private onIceCandidateCallback?: (candidate: RTCIceCandidateInit) => void;
  private onMessageCallback?: (data: ArrayBuffer | string) => void;
  private onStateChangeCallback?: (state: ConnectionState) => void;

  constructor(targetPeerId: string, isInitiator: boolean) {
    this.targetPeerId = targetPeerId;
    
    // Configuración STUN de Google (Gratis)
    this.peerConnection = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate && this.onIceCandidateCallback) {
        this.onIceCandidateCallback(event.candidate.toJSON());
      }
    };

    this.peerConnection.onconnectionstatechange = () => {
      this.state = this.peerConnection.connectionState as ConnectionState;
      if (this.onStateChangeCallback) this.onStateChangeCallback(this.state);
    };

    if (isInitiator) {
      this.setupDataChannel(this.peerConnection.createDataChannel('gameData', {
        ordered: false, // UDP-like behavior, ideal for fast action game
        maxRetransmits: 0 
      }));
    } else {
      this.peerConnection.ondatachannel = (event) => {
        this.setupDataChannel(event.channel);
      };
    }
  }

  private setupDataChannel(channel: RTCDataChannel) {
    this.dataChannel = channel;
    this.dataChannel.binaryType = 'arraybuffer';
    
    this.dataChannel.onopen = () => {
      this.state = 'connected';
      if (this.onStateChangeCallback) this.onStateChangeCallback(this.state);
    };
    
    this.dataChannel.onclose = () => {
      this.state = 'disconnected';
      if (this.onStateChangeCallback) this.onStateChangeCallback(this.state);
    };
    
    this.dataChannel.onmessage = (event) => {
      if (this.onMessageCallback) this.onMessageCallback(event.data);
    };
  }

  // Creación de oferta (Para el Initiator)
  async createOffer(): Promise<RTCSessionDescriptionInit> {
    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);
    return offer;
  }

  // Recepción de oferta y creación de respuesta (Para el Receiver)
  async handleOffer(offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    await this.peerConnection.setRemoteDescription(offer);
    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);
    return answer;
  }

  // Recepción de respuesta (Para el Initiator)
  async handleAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    await this.peerConnection.setRemoteDescription(answer);
  }

  // Recepción de ICE Candidates (Ambos lados)
  async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (this.peerConnection.remoteDescription) {
      await this.peerConnection.addIceCandidate(candidate);
    } else {
      // Debería encolarse si remoteDescription aún no está definido, 
      // pero para este boilerplate asumimos flujo ordenado.
    }
  }

  // Callbacks
  onIceCandidate(cb: (candidate: RTCIceCandidateInit) => void) { this.onIceCandidateCallback = cb; }
  onMessage(cb: (data: ArrayBuffer | string) => void) { this.onMessageCallback = cb; }
  onStateChange(cb: (state: ConnectionState) => void) { this.onStateChangeCallback = cb; }

  // Enviar mensaje
  send(data: ArrayBuffer | string) {
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      if (typeof data === 'string') {
        this.dataChannel.send(data);
      } else {
        this.dataChannel.send(data);
      }
    }
  }

  close() {
    this.dataChannel?.close();
    this.peerConnection.close();
  }
}
