import './style.css';

import * as THREE from 'three';

/*
              ,---,                                                                                                                      
           ,`--.' |                                                                                                                      
  ,----..  |   :  :                  ___                                                                       ____                      
 /   /   \ |   |  '                ,--.'|_          ,-.----.                                                 ,'  , `.            ,--,    
|   :     :'   :  |                |  | :,'         \    /  \                                             ,-+-,.' _ |   ,---.  ,--.'|    
.   |  ;. /;   |.'       .--.--.   :  : ' :         |   :    |              .--.--.                    ,-+-. ;   , ||  '   ,'\ |  |,     
.   ; /--` '---',---.   /  /    '.;__,'  /          |   | .\ :  ,--.--.    /  /    '                  ,--.'|'   |  || /   /   |`--'_     
;   | ;        /     \ |  :  /`./|  |   |           .   : |: | /       \  |  :  /`./                 |   |  ,', |  |,.   ; ,. :,' ,'|    
|   : |       /    /  ||  :  ;_  :__,'| :           |   |  \ :.--.  .-. | |  :  ;_                   |   | /  | |--' '   | |: :'  | |    
.   | '___   .    ' / | \  \    `. '  : |__         |   : .  | \__\/: . .  \  \    `.                |   : |  | ,    '   | .; :|  | :    
'   ; : .'|  '   ;   /|  `----.   \|  | '.'|        :     |`-' ," .--.; |   `----.   \               |   : |  |/     |   :    |'  : |__  
'   | '/  :  '   |  / | /  /`--'  /;  :    ;        :   : :   /  /  ,.  |  /  /`--'  /               |   | |`-'       \   \  / |  | '.'| 
|   :    /   |   :    |'--'.     / |  ,   /         |   | :  ;  :   .'   \'--'.     /                |   ;/            `----'  ;  :    ; 
 \   \ .'     \   \  /   `--'---'   ---`-'          `---'.|  |  ,     .-./  `--'---'                 '---'                     |  ,   /  
  `---`        `----'                                 `---`   `--`---'                                                          ---`-'   
                                                                                                                                         
*/
class MouseMeshInteractionHandler {
	constructor(mesh_name, handler_function) {
		this.mesh_name = mesh_name;
		this.handler_function = handler_function;
	}
}

class MouseMeshInteraction {
	constructor(scene, camera) {
		this.scene = scene;
		this.camera = camera;
		
		this.raycaster = new THREE.Raycaster();
		this.mouse = new THREE.Vector2();
		
		this.updated = false;
		this.event = '';
		
		// last mesh that the mouse cursor was over
		this.last_mouseenter_mesh = undefined;
		// last mesh that the mouse was pressing down
		this.last_pressed_mesh = undefined;
		
		this.handlers = new Map();
		
		this.handlers.set('click', []);
		this.handlers.set('dblclick', []);
		this.handlers.set('contextmenu', []);
		
		this.handlers.set('mousedown', []);
		this.handlers.set('mouseup', []);
		this.handlers.set('mouseenter', []);
		this.handlers.set('mouseleave', []);
		
		window.addEventListener('mousemove', this);
		
		window.addEventListener('click', this);
		window.addEventListener('dblclick', this);
		window.addEventListener('contextmenu', this);
		
		window.addEventListener('mousedown', this);
	}
	
	handleEvent(e) {
		switch(e.type) {
			case "mousemove": {
				this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
				this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
				this.updated = true;
				this.event = 'motion';
			}
			break;
			default: {
				this.updated = true;
				this.event = e.type;
			}
		}
	}
	
	addHandler(mesh_name, event_type, handler_function) {
		if (this.handlers.has(event_type)) {
			this.handlers.get(event_type).push(new MouseMeshInteractionHandler(mesh_name, handler_function));
		}
	}
	
	update() {
		if (this.updated) {
			// update the picking ray with the camera and mouse position
			this.raycaster.setFromCamera(this.mouse, this.camera);
			
			// calculate objects intersecting the picking ray
			const intersects = this.raycaster.intersectObjects(this.scene.children, true);
			
			if (intersects.length > 0) {
				// special test for events: 'mouseenter', 'mouseleave'
				if (this.event === 'motion') {
					let mouseenter_handlers = this.handlers.get('mouseenter');
					let mouseleave_handlers = this.handlers.get('mouseleave');
					
					if (mouseleave_handlers.length > 0) {
						for (const handler of mouseleave_handlers) {
							// if mesh was entered by mouse previously, but not anymore, that means it has been mouseleave'd
							if (
								this.last_mouseenter_mesh !== undefined
								&& intersects[0].object !== this.last_mouseenter_mesh
								&& handler.mesh_name === this.last_mouseenter_mesh.name
							) {
								handler.handler_function(this.last_mouseenter_mesh);
								break;
							}
						}
					}
					
					if (mouseenter_handlers.length > 0) {
						for (const handler of mouseenter_handlers) {
							if (handler.mesh_name === intersects[0].object.name && intersects[0].object !== this.last_mouseenter_mesh) {
								this.last_mouseenter_mesh = intersects[0].object;
								handler.handler_function(intersects[0].object);
								break;
							}
						}
					}
				}
				else {
					// if mouseup event has occurred
					if (this.event === 'click' && this.last_pressed_mesh === intersects[0].object) {
						for (const handler of this.handlers.get('mouseup')) {
							if (handler.mesh_name === intersects[0].object.name) {
								handler.handler_function(intersects[0].object);
								break;
							}
						}
						this.last_pressed_mesh = undefined;
					}
					
					// for mouseup event handler to work
					if (this.event === 'mousedown') {
						this.last_pressed_mesh = intersects[0].object;
					}
					
					let handlers_of_event = this.handlers.get(this.event);
					for (const handler of handlers_of_event) {
						if (handler.mesh_name === intersects[0].object.name) {
							handler.handler_function(intersects[0].object);
							break;
						}
					}
				}
			}
			// if mouse doesn't intersect any meshes
			else if (this.event === 'motion') {
				// special test for 'mouseleave' event
				// 			(since it may be triggered when cursor doesn't intersect with any meshes)
				for (const handler of this.handlers.get('mouseleave')) {
					// if mesh was entered by mouse previously, but not anymore, that means it has been mouseleave'd
					if (this.last_mouseenter_mesh !== undefined && handler.mesh_name === this.last_mouseenter_mesh.name) {
						handler.handler_function(this.last_mouseenter_mesh);
						this.last_mouseenter_mesh = undefined;
						break;
					}
				}
			}
			
			this.updated = false;
		}
	}
}
/*
              ,---,                                                                                                                      
           ,`--.' |                                                                                                                      
  ,----..  |   :  :                  ___                                                                       ____                      
 /   /   \ |   |  '                ,--.'|_          ,-.----.                                                 ,'  , `.            ,--,    
|   :     :'   :  |                |  | :,'         \    /  \                                             ,-+-,.' _ |   ,---.  ,--.'|    
.   |  ;. /;   |.'       .--.--.   :  : ' :         |   :    |              .--.--.                    ,-+-. ;   , ||  '   ,'\ |  |,     
.   ; /--` '---',---.   /  /    '.;__,'  /          |   | .\ :  ,--.--.    /  /    '                  ,--.'|'   |  || /   /   |`--'_     
;   | ;        /     \ |  :  /`./|  |   |           .   : |: | /       \  |  :  /`./                 |   |  ,', |  |,.   ; ,. :,' ,'|    
|   : |       /    /  ||  :  ;_  :__,'| :           |   |  \ :.--.  .-. | |  :  ;_                   |   | /  | |--' '   | |: :'  | |    
.   | '___   .    ' / | \  \    `. '  : |__         |   : .  | \__\/: . .  \  \    `.                |   : |  | ,    '   | .; :|  | :    
'   ; : .'|  '   ;   /|  `----.   \|  | '.'|        :     |`-' ," .--.; |   `----.   \               |   : |  |/     |   :    |'  : |__  
'   | '/  :  '   |  / | /  /`--'  /;  :    ;        :   : :   /  /  ,.  |  /  /`--'  /               |   | |`-'       \   \  / |  | '.'| 
|   :    /   |   :    |'--'.     / |  ,   /         |   | :  ;  :   .'   \'--'.     /                |   ;/            `----'  ;  :    ; 
 \   \ .'     \   \  /   `--'---'   ---`-'          `---'.|  |  ,     .-./  `--'---'                 '---'                     |  ,   /  
  `---`        `----'                                 `---`   `--`---'                                                          ---`-'   
                                                                                                                                         
*/

//SETUP
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth/window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGL1Renderer({
	canvas: document.querySelector('#bg'),
});
renderer.setPixelRatio( window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);

//Le premier tétraèdre et les lumières rouge et bleu
//Bleu
const pointLighttera = new THREE.PointLight( 0x0366fc ); 
//Rouge
const pointLighttera2 = new THREE.PointLight( 0xfc0b03 ); 
// const lightHelper = new THREE.PointLightHelper(pointLighttera);
// const lightHelper2 = new THREE.PointLightHelper(pointLighttera2);
// scene.add(lightHelper, lightHelper2);
const tetra = new THREE.Mesh(
	new THREE.TetrahedronGeometry(5,0),
	new THREE.MeshStandardMaterial( {color: 0xffffff})
	);
tetra.name = 'Tetra';
pointLighttera.position.set(20,5,-15);
pointLighttera2.position.set(1,-10,-25);
tetra.position.set(15,0,-20);
scene.add( pointLighttera, pointLighttera2,tetra );

// //Separation cube
// const cube_block = new THREE.Mesh(
// 	new THREE.BoxGeometry(30,30,30),
// 	new THREE.MeshBasicMaterial()
// 	); 
// cube_block.position.set(15,0,-20);
// scene.add(cube_block);

//Social Octoedron
const LKIN_Texture = new THREE.TextureLoader().load('LinkedIn_logo_initials.png');
const SocialOcto = new THREE.Mesh(
	new THREE.BoxGeometry(1,1,1),
	new THREE.MeshBasicMaterial({map:LKIN_Texture})
	);
SocialOcto.name = 'SocialOcto';
SocialOcto.position.set(-10,-6,1);
scene.add(SocialOcto);

// const pointLight_octo = new THREE.PointLight( 0x4287f5);
// pointLight_octo.position.set(-12,-6,3);
// const lightHelper_octo = new THREE.PointLightHelper(pointLight_octo);
// scene.add(lightHelper_octo);
// scene.add( pointLight_octo );

//Github's cube
const gitcubeTexture = new THREE.TextureLoader().load('logo-github.png');
const git = new THREE.Mesh( 
	new THREE.BoxGeometry( 1, 1, 1 ),
	new THREE.MeshBasicMaterial( {map:gitcubeTexture} ) 
	);
git.name = 'gitcube';
git.position.set(-24,-23,20);
scene.add( git);

//Thanks TORUS
const torusKnot = new THREE.Mesh( 
	new THREE.TorusKnotGeometry( 10, 3, 100, 16 ),
	new THREE.MeshBasicMaterial( { color: 0xdb2342 } ) 
	);
torusKnot.position.set(-20,-40,10);
torusKnot.name = 'THX_T';
scene.add( torusKnot );

function getRandomInt(max) {
	return Math.floor(Math.random() * max);
};

function randomcolors(){
	var rand_number = getRandomInt(16777216);
	return rand_number;
};

function addStar(){
	const geometryStar = new THREE.SphereGeometry( 0.25, 24, 24);
	const materialStar = new THREE.MeshBasicMaterial({color: randomcolors()});
	const star = new THREE.Mesh(geometryStar, materialStar);

	const [x,y,z] = Array(3).fill().map(()=>THREE.MathUtils.randFloatSpread(500));

	star.position.set(x,y,z);
	scene.add(star);
}

function moveCamera(){
	
	const t = document.body.getBoundingClientRect().top;
	
	camera.position.z = t * -0.01;
	camera.position.y = t * +0.01;
	camera.position.x = t * +0.01;
}


//Thanks to : Daniel Blagy
//LINK to GitHub
const mmi = new MouseMeshInteraction(scene, camera);
mmi.addHandler('gitcube','click',function(){
	console.log("gitcube clicked!");
	window.open('https://github.com/Yalpit?tab=repositories', '_blank');
	// window.location.href = "https://github.com/Yalpit";
});

//LINK to linkedIn
const mmiLink = new MouseMeshInteraction(scene, camera);
mmiLink.addHandler('SocialOcto','click',function(){
	console.log("Linkedin clicked!");
	window.open('https://www.linkedin.com/in/charles-damaggio-297934243/?trk=public-profile-join-page', '_blank');
	// window.location.href = "https://github.com/Yalpit";
});

//Sound of the Tetraedron
var audio = new Audio('stonk sound effect.mp3');
const mmiTetra = new MouseMeshInteraction(scene, camera);
mmiLink.addHandler('Tetra','click',function(){
	console.log("Terahedron clicked!");
	audio.play();
});

document.body.onscroll = moveCamera;
Array(2000).fill().forEach(addStar);

function animate() {
	requestAnimationFrame( animate );

	mmi.update();
	mmiLink.update();
	mmiTetra.update();

	tetra.rotation.x += 0.02;
	tetra.rotation.y += 0.02;

	git.rotation.y += 0.01;
	SocialOcto.rotation.z += 0.01;
	SocialOcto.rotation.x += 0.01;

	renderer.render( scene, camera );

};

animate();
