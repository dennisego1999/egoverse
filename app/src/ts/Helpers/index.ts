import { Mesh, Object3D, Quaternion as ThreeQuaternion, Scene } from 'three';
import { Quaternion as CannonQuaternion } from 'cannon-es';

export function lerp(value1: number, value2: number, amount: number): number {
	// Set amount
	amount = amount < 0 ? 0 : amount;
	amount = amount > 1 ? 1 : amount;

	return value1 + (value2 - value1) * amount;
}

export function clampNumber(num: number, a: number, b: number): number {
	return Math.max(Math.min(num, Math.max(a, b)), Math.min(a, b));
}

export function wait(seconds: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
}

export function copyQuaternionToCannon(threeQuaternion: ThreeQuaternion): CannonQuaternion {
	return new CannonQuaternion(threeQuaternion.x, threeQuaternion.y, threeQuaternion.z, threeQuaternion.w);
}

export function flattenChildren(array: Array<Object3D>, d: number = 1): Array<Object3D> {
	return d > 0
		? array.reduce<Array<Object3D>>((acc, val) => {
				const children = Array.isArray(val.children) ? flattenChildren(val.children as Array<Object3D>, d - 1) : [];
				return acc.concat(children.length > 0 ? children : val);
			}, [])
		: array.slice();
}

export function getMeshes(meshes: Array<Mesh>, names: Array<string>): Array<Mesh> {
	return meshes.filter((mesh) => names.includes(mesh.name));
}

export const getChildren = (scene: Scene, keys: Array<string>, matching: string): Array<Object3D> => {
	return flattenChildren(scene.children, Infinity).filter((child: Object3D) => {
		return keys.find((key) => {
			return isMatching(child, {
				name: key,
				matching
			});
		});
	});
};

export function isMatching(item: Object3D, binding: { name: string; matching: string }): string | boolean | undefined {
	const parentName = item.parent?.type === 'Group' ? item.parent.name : undefined;

	switch (binding.matching) {
		case 'partial':
			return item.name.indexOf(binding.name) > -1 || (parentName && parentName.indexOf(binding.name) > -1);

		case 'exact':
		default:
			return item.name === binding.name || (parentName && parentName === binding.name);
	}
}

export function generateRandomNumber(min: number, max: number): number {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}
