import ExperienceScene from './ExperienceScene';
import { BoxGeometry, Mesh, MeshBasicMaterial } from 'three';

export class ChatRoomScene extends ExperienceScene {
	constructor(canvas: HTMLCanvasElement) {
		super(canvas);

		this.init();
	}

	init() {
		const geometry = new BoxGeometry( 1, 1, 1 );
		const material = new MeshBasicMaterial( { color: 'blue' } );
		const cube = new Mesh( geometry, material );
		this.scene.add( cube );
	}

	update(delta: number): void {
		console.log('updating CHAT ROOM', delta);
	}
}