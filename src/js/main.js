// Import necessary Three.js modules
import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

// Debug flag
const DEBUG = true;

// Check for WebGL support
function checkWebGLSupport() {
    try {
        const canvas = document.createElement('canvas');
        return !!(window.WebGLRenderingContext && 
            (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
    } catch (e) {
        return false;
    }
}

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
        debug("Checking WebGL support...");
        if (!checkWebGLSupport()) {
            const message = "WebGL is not supported in your browser. Please try using a modern browser with WebGL support.";
            console.error(message);
            alert(message);
            return;
        }
        debug("WebGL is supported");

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
        this.lastInteractionCheck = 0; // Track last building interaction check
        
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
        
        try {
            // Create scene with fog for atmosphere
            this.scene = new THREE.Scene();
            this.scene.background = new THREE.Color(0x88ccff); // Sky blue
            this.scene.fog = new THREE.Fog(0x88ccff, 0, 750);
            debug("Scene created");
            
            // Load 3D models with Draco compression support
            const loader = new GLTFLoader();
            const dracoLoader = new DRACOLoader();
            dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
            loader.setDRACOLoader(dracoLoader);
            
            // Array of models to load
            const models = [
                {
                    path: '/src/assets/models/capstone2_blacktower-transformed.glb',
                    position: new THREE.Vector3(0, 0, 0),
                    scale: new THREE.Vector3(1, 1, 1)
                },
                {
                    path: '/src/assets/models/capstone2_browntower-transformed.glb',
                    position: new THREE.Vector3(30, 0, 0), // Position it 30 units to the right
                    scale: new THREE.Vector3(1, 1, 1)
                },
                {
                    path: '/src/assets/models/capstone2_indivqube-transformed.glb',
                    position: new THREE.Vector3(-30, 0, 0), // Position it 30 units to the left
                    scale: new THREE.Vector3(1, 1, 1)
                },
                {
                    path: '/src/assets/models/capstone2_lowoffice-transformed.glb',
                    position: new THREE.Vector3(0, 0, 30), // Position it 30 units forward
                    scale: new THREE.Vector3(1, 1, 1)
                }
            ];

            // Load all models
            models.forEach((model, index) => {
                loader.load(
                    model.path,
                    (gltf) => {
                        // Position and scale the model according to its settings
                        gltf.scene.position.copy(model.position);
                        gltf.scene.scale.copy(model.scale);
                        
                        // Optimize model performance
                        gltf.scene.traverse((node) => {
                            if (node.isMesh) {
                                // Enable frustum culling
                                node.frustumCulled = true;
                                
                                // Optimize geometry
                                if (node.geometry) {
                                    node.geometry.computeBoundingSphere();
                                    node.geometry.computeBoundingBox();
                                }
                                
                                // Optimize materials
                                if (node.material) {
                                    // Disable expensive material features
                                    node.material.precision = 'lowp'; // Use low precision
                                    node.material.fog = false; // Disable fog calculations for the model
                                }
                            }
                        });
                        
                        this.scene.add(gltf.scene);
                        debug(`3D model ${index + 1} loaded successfully: ${model.path}`);
                    },
                    (xhr) => {
                        const progress = (xhr.loaded / xhr.total * 100);
                        debug(`Loading model ${index + 1}: ${Math.round(progress)}%`);
                    },
                    (error) => {
                        console.error(`Error loading 3D model ${index + 1}:`, error);
                        debug(`Failed to load 3D model ${index + 1}: ${error.message}`);
                    }
                );
            });
            
            // Create camera
            this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 1000);
            this.camera.position.set(0, 10, 150); // Position between inner (100) and outer (200) circles
            debug("Camera created");
            
            // Create renderer first to catch any WebGL context errors early
            this.renderer = new THREE.WebGLRenderer({ 
                antialias: true,
                canvas: document.createElement('canvas'),
                context: null // Let Three.js handle context creation
            });
            this.renderer.setPixelRatio(window.devicePixelRatio);
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.renderer.shadowMap.enabled = true;
            this.container.appendChild(this.renderer.domElement);
            debug("Renderer created and added to container");

            // Add test cube to verify scene is working
            const geometry = new THREE.BoxGeometry(10, 10, 10);
            const material = new THREE.MeshPhongMaterial({ color: 0xff0000 });
            const cube = new THREE.Mesh(geometry, material);
            cube.position.set(0, 5, 0);
            this.scene.add(cube);
            debug("Test cube added");

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
            
            // Handle window resize
            window.addEventListener('resize', () => this.onWindowResize(), false);
        } catch (error) {
            console.error("Critical error during initialization:", error);
            alert(`Failed to initialize 3D scene: ${error.message}`);
            throw error;
        }
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
        // Create the central circular road
        this.createCircularRoad(150, 20); // 150 units radius (between 100 and 200), 20 units width
        
        // Inner circle buildings (6) - Skills Learned
        this.createBuildingCircle(6, 100, {
            names: [
                'Time Management Hub',
                'Social Skills Center',
                'Gratitude Hotel',
                'Creative Thinking Office',
                'Self-Awareness Tower',
                'Tech Passion Hotel'
            ],
            descriptions: [
                'Development of planning and time management abilities.',
                'Journey of becoming more socially comfortable while maintaining independence.',
                'Learning to appreciate life\'s moments and experiences.',
                'Nurturing creative problem-solving and analytical thinking.',
                'Understanding and managing intrusive thoughts and limiting beliefs.',
                'Growing passion for technology, coding, and computer science.'
            ],
            styles: [
                'modern',      // Time Management
                'modern',      // Social Skills
                'postmodern',  // Gratitude
                'modern',      // Creative Thinking
                'modern',      // Self-Awareness
                'postmodern'   // Tech Passion
            ],
            colors: [
                0xE0E0E0,     // Modern white
                0xD2B48C,     // Modern earthy
                0xFF6B6B,     // Postmodern vibrant red
                0xF5DEB3,     // Modern wheat
                0xE6E6FA,     // Modern light purple
                0x00CED1      // Postmodern turquoise
            ],
            heights: [35, 40, 45, 38, 42, 48]
        });
        
        // Outer circle buildings (8) - Life Experiences
        this.createBuildingCircle(8, 200, {
            names: [
                'Childhood Wonder Tower',    // Art Deco
                'Athletics Hotel',           // Postmodern
                'Homeschool Office',         // Modern
                'Pandemic Learning Center',   // Modern
                'High School Hub',           // Postmodern
                'Social Life Hotel',         // Postmodern
                'Grad Committee Hotel',      // Postmodern
                'University Applications'     // Modern
            ],
            descriptions: [
                'Early fascination with playgrounds, elevators, and water slides.',
                'Journey through cross-country and track and field teams.',
                'Experience of personalized education through homeschooling.',
                'Adapting to public school during the COVID-19 pandemic.',
                'Academic achievements and course experiences.',
                'Growing social connections and peer interactions.',
                'Leadership and planning experience in graduation committee.',
                'Process of exploring and applying to universities.'
            ],
            styles: [
                'artdeco',    // Childhood
                'postmodern', // Athletics
                'modern',     // Homeschool
                'modern',     // Pandemic
                'postmodern', // High School
                'postmodern', // Social
                'postmodern', // Grad Committee
                'modern'      // University
            ],
            colors: [
                0xBEB8A7,     // Art Deco beige
                0x7FFFD4,     // Postmodern aquamarine
                0xFFFFFF,     // Modern white
                0xF0F8FF,     // Modern alice blue
                0xFF69B4,     // Postmodern hot pink
                0x98FB98,     // Postmodern pale green
                0x9370DB,     // Postmodern medium purple
                0xB0C4DE      // Modern light steel blue
            ],
            heights: [30, 45, 35, 38, 50, 42, 48, 40]
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
                options.descriptions[i],
                options.styles[i]
            );
            
            // Add to building list for interaction
            this.buildings.push(building);
        }
    }
    
    createBuilding(x, y, z, width, height, depth, color, name, description, style) {
        let geometry;
        
        switch(style) {
            case 'artdeco':
                // Art Deco style - geometric patterns and stepped form
                const artDecoPoints = [];
                const steps = 5;
                const stepHeight = height / steps;
                
                // Start from the bottom (y = -height/2)
                for (let i = 0; i <= steps; i++) {
                    const stepWidth = width * (1 - (i * 0.15));
                    artDecoPoints.push(new THREE.Vector2(stepWidth/2, (i * stepHeight) - height/2));
                }
                
                // Mirror points for the other side
                for (let i = steps; i >= 0; i--) {
                    const stepWidth = width * (1 - (i * 0.15));
                    artDecoPoints.push(new THREE.Vector2(-stepWidth/2, (i * stepHeight) - height/2));
                }
                
                geometry = new THREE.LatheGeometry(artDecoPoints, 4);
                break;
                
            case 'modern':
                // Modern style - clean lines with glass panels
                geometry = new THREE.BoxGeometry(width, height, depth);
                break;
                
            case 'postmodern':
                // Postmodern style - irregular shapes and organic forms
                const points = [];
                const curvePoints = 8;
                
                // Start from the bottom (y = -height/2)
                for (let i = 0; i <= curvePoints; i++) {
                    const t = i / curvePoints;
                    const w = width/2 * (1 + Math.sin(t * Math.PI * 2) * 0.3);
                    points.push(new THREE.Vector2(w, (t * height) - height/2));
                }
                
                geometry = new THREE.LatheGeometry(points, 8);
                break;
                
            default:
                geometry = new THREE.BoxGeometry(width, height, depth);
        }
        
        // Create materials based on style
        let material;
        switch(style) {
            case 'artdeco':
                material = new THREE.MeshPhongMaterial({ 
                    color: color,
                    flatShading: true,
                    shininess: 30
                });
                break;
                
            case 'modern':
                material = new THREE.MeshPhysicalMaterial({ 
                    color: color,
                    metalness: 0.2,
                    roughness: 0.1,
                    transparent: true,
                    opacity: 0.9,
                    reflectivity: 1
                });
                break;
                
            case 'postmodern':
                material = new THREE.MeshStandardMaterial({ 
                    color: color,
                    metalness: 0.5,
                    roughness: 0.3,
                    envMapIntensity: 1.5
                });
                break;
                
            default:
                material = new THREE.MeshLambertMaterial({ color: color });
        }
        
        const building = new THREE.Mesh(geometry, material);
        
        // Position the building - move up by half height to sit on ground
        building.position.set(x, y + height/2, z);
        building.castShadow = true;
        building.receiveShadow = true;
        
        // Add metadata for interaction
        building.userData = {
            name: name,
            description: description,
            isBuilding: true,
            style: style
        };
        
        // Add to scene
        this.scene.add(building);
        
        // Create a info div for this building
        const buildingInfoDiv = document.createElement('div');
        buildingInfoDiv.className = 'building-info';
        buildingInfoDiv.innerHTML = `
            <h2>${name}</h2>
            <p>${description}</p>
            <p class="style-info">Style: ${style.charAt(0).toUpperCase() + style.slice(1)}</p>
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
                const time = performance.now();
                const fixedDelta = 1/60; // Fixed 60 FPS time step
                const actualDelta = Math.min((time - this.prevTime) / 1000, 0.1); // Cap at 100ms
                
                // Character movement with reduced friction and adjusted gravity
                const friction = 5.0; // Reduced from 10.0 for smoother deceleration
                this.velocity.x -= this.velocity.x * friction * fixedDelta;
                this.velocity.z -= this.velocity.z * friction * fixedDelta;
                this.velocity.y -= 9.8 * 50.0 * fixedDelta; // Reduced gravity multiplier
                
                // Set movement direction based on keys pressed
                this.direction.z = Number(this.moveForward) - Number(this.moveBackward);
                this.direction.x = Number(this.moveRight) - Number(this.moveLeft);
                this.direction.normalize();
                
                // Apply movement with reduced base speed
                const baseSpeed = 200.0; // Reduced from 400.0 for more controlled movement
                const currentSpeed = baseSpeed * (this.velocity.length() < 0.1 ? 1.5 : 1.0); // Speed boost when starting from rest
                
                if (this.moveForward || this.moveBackward) {
                    this.velocity.z -= this.direction.z * currentSpeed * fixedDelta;
                }
                if (this.moveLeft || this.moveRight) {
                    this.velocity.x -= this.direction.x * currentSpeed * fixedDelta;
                }
                
                // Limit maximum velocity
                const maxSpeed = 300.0;
                const currentVelocity = new THREE.Vector2(this.velocity.x, this.velocity.z);
                if (currentVelocity.length() > maxSpeed) {
                    currentVelocity.normalize().multiplyScalar(maxSpeed);
                    this.velocity.x = currentVelocity.x;
                    this.velocity.z = currentVelocity.y;
                }
                
                // Apply smoothed movement
                const moveX = -this.velocity.x * actualDelta;
                const moveZ = -this.velocity.z * actualDelta;
                
                this.controls.moveRight(moveX);
                this.controls.moveForward(moveZ);
                
                // Vertical movement (jumping/falling)
                this.controls.getObject().position.y += (this.velocity.y * actualDelta);
                
                // Keep character above ground
                if (this.controls.getObject().position.y < 10) {
                    this.velocity.y = 0;
                    this.controls.getObject().position.y = 10;
                    this.canJump = true;
                }
                
                // Update character position and check for interactions
                this.character.position.copy(this.controls.getObject().position);
                this.character.rotation.y = this.controls.getObject().rotation.y;
                
                if (time - this.lastInteractionCheck > 100) {
                    this.checkBuildingInteraction();
                    this.lastInteractionCheck = time;
                }
                
                this.prevTime = time;
            }
            
            this.renderer.render(this.scene, this.camera);
        } catch (error) {
            console.error("Error in animation loop:", error);
        }
    }
    
    createCircularRoad(radius, width) {
        // Create white lane marking material
        const markingMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
        
        // Create 5 circular dividers to make 6 lanes
        for (let i = 1; i <= 5; i++) {
            const markingRadius = radius - width/2 + (i * width/6);
            const markingGeometry = new THREE.TorusGeometry(markingRadius, 0.2, 16, 100);
            const marking = new THREE.Mesh(markingGeometry, markingMaterial);
            marking.rotation.x = Math.PI / 2;
            marking.position.y = 0.11; // Slightly above ground
            this.scene.add(marking);
        }
        
        // Add outer edge marking
        const outerMarkingGeometry = new THREE.TorusGeometry(radius + width/2, 0.2, 16, 100);
        const outerMarking = new THREE.Mesh(outerMarkingGeometry, markingMaterial);
        outerMarking.rotation.x = Math.PI / 2;
        outerMarking.position.y = 0.11;
        this.scene.add(outerMarking);
        
        // Add inner edge marking
        const innerMarkingGeometry = new THREE.TorusGeometry(radius - width/2, 0.2, 16, 100);
        const innerMarking = new THREE.Mesh(innerMarkingGeometry, markingMaterial);
        innerMarking.rotation.x = Math.PI / 2;
        innerMarking.position.y = 0.11;
        this.scene.add(innerMarking);
    }
}

// Start the application when the page is loaded
window.addEventListener('load', () => {
    new PortfolioCity();
}); 