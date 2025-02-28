export enum SocketEvent {
	INIT = 'init',
	USER_CONNECT = 'user:connect',
	USER_DISCONNECT = 'user:disconnect',
	CLIENT_SPAWN_PLAYER = 'client-spawn-player',
	CLIENT_UPDATE_PLAYER = 'client-update-player',
	JOIN_SCENE = 'join-scene',
	SEND_MESSAGE = 'send-message',
	TRIGGER_EMOTE = 'trigger-emote',
	FAILED = 'failed'
}
