// Import necessary Three.js modules
import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

// Debug flag
const DEBUG = true;

// Debug logger
function debug(message) {
    if (DEBUG) {
        console.log(`[DEBUG]: ${message}`);
        
        // Also add to debug UI
        const debugDiv = document.getElementById('debug');
        if (debugDiv) {
            debugDiv.style.display = 'block';
            const timestamp = new Date().toISOString().substr(11, 8);
            const msgElement = document.createElement('div');
            msgElement.textContent = `[${timestamp}] ${message}`;
            debugDiv.appendChild(msgElement);
            
            // Limit the number of messages
            if (debugDiv.children.length > 10) {
                debugDiv.removeChild(debugDiv.children[0]);
            }
        }
    }
}

// Error handler
window.addEventListener('error', function(e) {
    console.error('Global error: ', e.error);
    alert(`An error occurred: ${e.error.message}`);
});

// Main application class
class PortfolioCity {
    constructor() {
        debug("Initializing PortfolioCity application");
        
        // Setup properties
        this.container = document.getElementById('container');
        if (!this.container) {
            console.error("Container element not found!");
        }
        
        this.infoPanel = document.getElementById('info');
        if (!this.infoPanel) {
            console.error("Info panel element not found!");
        }
        
        // Three.js components
        this.camera = null;
        this.scene = null;
        this.renderer = null;
        this.controls = null;
        this.raycaster = new THREE.Raycaster();
        
        // Character properties
        this.character = null;
        this.moveForward = false;
        this.moveBackward = false;
        this.moveLeft = false;
        this.moveRight = false;
        this.canJump = false;
        this.velocity = new THREE.Vector3();
        this.direction = new THREE.Vector3();
        this.prevTime = performance.now();
        
        // Buildings and city data
        this.buildings = [];
        this.currentBuilding = null;
        
        try {
            // Initialize the application
            this.init();
            this.setupEventListeners();
            this.animate();
            debug("Application initialized successfully");
        } catch (error) {
            console.error("Error initializing application:", error);
            alert(`Failed to initialize: ${error.message}`);
        }
    }
    
    init() {
        debug("Initializing Three.js components");
        
        // Create camera
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 1000);
        this.camera.position.y = 10; // Character height
        debug("Camera created");
        
        // Create scene with fog for atmosphere
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x88ccff); // Sky blue
        this.scene.fog = new THREE.Fog(0x88ccff, 0, 750);
        debug("Scene created");
        
        // Add lighting
        const ambientLight = new THREE.AmbientLight(0x404040);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(1, 1, 0.5).normalize();
        this.scene.add(directionalLight);
        debug("Lighting added");
        
        // Create ground
        const groundGeometry = new THREE.PlaneGeometry(2000, 2000);
        const groundMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x407020,
            side: THREE.DoubleSide 
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);
        debug("Ground created");
        
        // Create simple character representation (visible in third-person view)
        this.createCharacter();
        debug("Character created");
        
        // Create controls
        try {
            this.controls = new PointerLockControls(this.camera, document.body);
            this.scene.add(this.controls.getObject());
            debug("Controls created");
        } catch (error) {
            console.error("Error creating controls:", error);
        }
        
        // Create the city buildings
        this.createCity();
        debug("City created with " + this.buildings.length + " buildings");
        
        // Create renderer
        try {
            this.renderer = new THREE.WebGLRenderer({ antialias: true });
            this.renderer.setPixelRatio(window.devicePixelRatio);
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.renderer.shadowMap.enabled = true;
            this.container.appendChild(this.renderer.domElement);
            debug("Renderer created and added to container");
        } catch (error) {
            console.error("Error creating renderer:", error);
        }
        
        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize(), false);
    }
    
    createCharacter() {
        // Create a simple character model (a cylinder with a sphere on top)
        const characterGroup = new THREE.Group();
        
        // Body (cylinder)
        const bodyGeometry = new THREE.CylinderGeometry(2, 2, 6, 8);
        const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0x2255dd });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 3;
        characterGroup.add(body);
        
        // Head (sphere)
        const headGeometry = new THREE.SphereGeometry(2, 16, 16);
        const headMaterial = new THREE.MeshLambertMaterial({ color: 0xffaa88 });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = 8;
        characterGroup.add(head);
        
        // Save reference to character
        this.character = characterGroup;
        
        // The character will only be visible in third-person view (if implemented)
        this.character.visible = false;
        
        this.scene.add(this.character);
    }
    
    createCity() {
        // Inner circle buildings (6)
        this.createBuildingCircle(6, 100, {
            names: [
                'Education Building',
                'Work Experience',
                'Skills Building',
                'Projects Tower',
                'Family House',
                'Hobbies Center'
            ],
            descriptions: [
                'Educational background and academic achievements.',
                'Professional work history and accomplishments.',
                'Technical and soft skills showcase.',
                'Portfolio of personal and professional projects.',
                'Family background and personal values.',
                'Personal interests and recreational activities.'
            ],
            colors: [
                0x8844aa, // Purple
                0x4477dd, // Blue
                0x44aa88, // Teal
                0xaadd44, // Lime
                0xddaa44, // Orange
                0xdd4444  // Red
            ],
            heights: [30, 45, 35, 50, 25, 40]
        });
        
        // Outer circle buildings (6)
        this.createBuildingCircle(6, 200, {
            names: [
                'Awards Building',
                'Publications House',
                'Volunteering Center',
                'Languages Tower',
                'Certifications Building',
                'Future Goals Skyscraper'
            ],
            descriptions: [
                'Recognition and achievements received throughout career.',
                'Published articles, papers, and other written works.',
                'Community service and volunteer experiences.',
                'Languages spoken and proficiency levels.',
                'Professional certifications and courses completed.',
                'Career aspirations and future objectives.'
            ],
            colors: [
                0xaa44dd, // Bright Purple
                0x44aadd, // Light Blue
                0x44ddaa, // Light Teal
                0xddaa44, // Gold
                0xdd44aa, // Pink
                0x44dd44  // Green
            ],
            heights: [35, 30, 25, 40, 35, 55]
        });
    }
    
    createBuildingCircle(count, radius, options) {
        for (let i = 0; i < count; i++) {
            // Calculate position in a circle
            const angle = (i / count) * Math.PI * 2;
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            
            // Create building
            const building = this.createBuilding(
                x, 
                0, 
                z, 
                30, // width
                options.heights[i], 
                30, // depth
                options.colors[i],
                options.names[i],
                options.descriptions[i]
            );
            
            // Add to building list for interaction
            this.buildings.push(building);
        }
    }
    
    createBuilding(x, y, z, width, height, depth, color, name, description) {
        // Create different building styles based on height
        let geometry;
        
        if (height > 45) {
            // Skyscraper style - taller and narrower at top
            const points = [];
            points.push(new THREE.Vector2(width/2, 0));
            points.push(new THREE.Vector2(width/2, height * 0.7));
            points.push(new THREE.Vector2(width/3, height));
            points.push(new THREE.Vector2(-width/3, height));
            points.push(new THREE.Vector2(-width/2, height * 0.7));
            points.push(new THREE.Vector2(-width/2, 0));
            
            geometry = new THREE.LatheGeometry(points, 4);
        } else if (height > 35) {
            // Office building style - with windows
            geometry = new THREE.BoxGeometry(width, height, depth);
            
            // Add window material (not implemented in this basic version)
        } else {
            // Standard building
            geometry = new THREE.BoxGeometry(width, height, depth);
        }
        
        const material = new THREE.MeshLambertMaterial({ color: color });
        const building = new THREE.Mesh(geometry, material);
        
        // Position the building
        building.position.set(x, y + height / 2, z);
        building.castShadow = true;
        building.receiveShadow = true;
        
        // Add metadata for interaction
        building.userData = {
            name: name,
            description: description,
            isBuilding: true
        };
        
        // Add to scene
        this.scene.add(building);
        
        // Create a info div for this building
        const buildingInfoDiv = document.createElement('div');
        buildingInfoDiv.className = 'building-info';
        buildingInfoDiv.innerHTML = `
            <h2>${name}</h2>
            <p>${description}</p>
        `;
        document.body.appendChild(buildingInfoDiv);
        
        // Store the DOM element reference
        building.userData.infoElement = buildingInfoDiv;
        
        return building;
    }
    
    setupEventListeners() {
        // Click handler to start pointer lock
        this.container.addEventListener('click', () => {
            this.controls.lock();
        });
        
        // Event listeners for pointer lock
        this.controls.addEventListener('lock', () => {
            this.infoPanel.style.opacity = '0.2';
        });
        
        this.controls.addEventListener('unlock', () => {
            this.infoPanel.style.opacity = '1';
        });
        
        // Keyboard controls
        const onKeyDown = (event) => {
            switch (event.code) {
                case 'ArrowUp':
                case 'KeyW':
                    this.moveForward = true;
                    break;
                case 'ArrowLeft':
                case 'KeyA':
                    this.moveLeft = true;
                    break;
                case 'ArrowDown':
                case 'KeyS':
                    this.moveBackward = true;
                    break;
                case 'ArrowRight':
                case 'KeyD':
                    this.moveRight = true;
                    break;
                case 'Space':
                    if (this.canJump === true) this.velocity.y += 350;
                    this.canJump = false;
                    break;
            }
        };
        
        const onKeyUp = (event) => {
            switch (event.code) {
                case 'ArrowUp':
                case 'KeyW':
                    this.moveForward = false;
                    break;
                case 'ArrowLeft':
                case 'KeyA':
                    this.moveLeft = false;
                    break;
                case 'ArrowDown':
                case 'KeyS':
                    this.moveBackward = false;
                    break;
                case 'ArrowRight':
                case 'KeyD':
                    this.moveRight = false;
                    break;
            }
        };
        
        document.addEventListener('keydown', onKeyDown);
        document.addEventListener('keyup', onKeyUp);
    }
    
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    checkBuildingInteraction() {
        // Create a ray from the camera position in the direction the camera is looking
        this.raycaster.set(
            this.controls.getObject().position,
            new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion)
        );
        
        // Check for intersections with buildings
        const intersects = this.raycaster.intersectObjects(this.scene.children);
        
        // Hide current building info if we're showing one
        if (this.currentBuilding) {
            this.currentBuilding.userData.infoElement.classList.remove('active');
            this.currentBuilding = null;
        }
        
        // If we found a building and it's close enough, show its info
        for (const intersect of intersects) {
            const object = intersect.object;
            
            // Check if it's a building and within interaction distance (50 units)
            if (object.userData && object.userData.isBuilding && intersect.distance < 50) {
                this.currentBuilding = object;
                object.userData.infoElement.classList.add('active');
                break;
            }
        }
    }
    
    animate() {
        try {
            requestAnimationFrame(() => this.animate());
            
            if (this.controls.isLocked === true) {
                // Character movement
                const time = performance.now();
                const delta = (time - this.prevTime) / 1000; // Time in seconds
                
                // Apply friction/drag
                this.velocity.x -= this.velocity.x * 10.0 * delta;
                this.velocity.z -= this.velocity.z * 10.0 * delta;
                this.velocity.y -= 9.8 * 100.0 * delta; // Gravity
                
                // Set movement direction based on keys pressed
                this.direction.z = Number(this.moveForward) - Number(this.moveBackward);
                this.direction.x = Number(this.moveRight) - Number(this.moveLeft);
                this.direction.normalize(); // Ensure consistent movement in all directions
                
                // Apply movement to velocity
                const speed = 400.0; // Movement speed
                if (this.moveForward || this.moveBackward) this.velocity.z -= this.direction.z * speed * delta;
                if (this.moveLeft || this.moveRight) this.velocity.x -= this.direction.x * speed * delta;
                
                // Apply velocity to controls/camera
                this.controls.moveRight(-this.velocity.x * delta);
                this.controls.moveForward(-this.velocity.z * delta);
                
                // Vertical movement (jumping/falling)
                this.controls.getObject().position.y += (this.velocity.y * delta);
                
                // Keep character above ground
                if (this.controls.getObject().position.y < 10) {
                    this.velocity.y = 0;
                    this.controls.getObject().position.y = 10;
                    this.canJump = true;
                }
                
                // Update character position to match camera (for third-person view if implemented)
                this.character.position.copy(this.controls.getObject().position);
                this.character.rotation.y = this.controls.getObject().rotation.y;
                
                // Check for building interactions
                this.checkBuildingInteraction();
                
                this.prevTime = time;
            }
            
            // Render the scene
            this.renderer.render(this.scene, this.camera);
        } catch (error) {
            console.error("Error in animation loop:", error);
            // Don't crash the animation loop, continue on next frame
        }
    }
}

// Start the application when the page is loaded
window.addEventListener('load', () => {
    new PortfolioCity();
}); 