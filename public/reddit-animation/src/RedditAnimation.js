/**
 * RedditAnimation.js
 * Clase principal para renderizar y animar modelos VRM con Three.js
 * 
 * Uso:
 *   const snoo = new RedditAnimation({ container: '#app' });
 *   await snoo.init();
 *   await snoo.loadVRM('./models/finalsnoo.vrm');
 *   await snoo.playAnimation('./animations/dance.fbx');
 *   snoo.setTextures({ skin: '02', hoodie: '15', eyes: '03' });
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';

import { MixamoRigMap } from './MixamoRigMap.js';
import { SceneConfig, mergeConfig } from './SceneConfig.js';

export class RedditAnimation {
    /**
     * @param {Object} options
     * @param {string|HTMLElement} options.container - Selector CSS o elemento DOM
     * @param {Object} options.config - Configuración personalizada (ver SceneConfig.js)
     */
    constructor(options = {}) {
        this.container = typeof options.container === 'string' 
            ? document.querySelector(options.container) 
            : options.container;
            
        if (!this.container) {
            throw new Error('RedditAnimation: container no encontrado');
        }
        
        this.config = mergeConfig(options.config || {});
        
        // Three.js core
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        
        // VRM
        this.vrm = null;
        this.vrmScene = null;
        
        // Animation
        this.mixer = null;
        this.currentAction = null;
        this.clock = new THREE.Clock();
        
        // Loaders
        this.gltfLoader = null;
        this.fbxLoader = null;
        this.textureLoader = null;
        
        // State
        this.isInitialized = false;
        this.isAnimating = false;
        this.animationFrameId = null;
        
        // Materials cache
        this.materials = {
            skin: null,
            leftEye: null,
            rightEye: null,
            hoodie: null
        };
        
        // Bind methods
        this._animate = this._animate.bind(this);
        this._onResize = this._onResize.bind(this);
    }
    
    /**
     * Inicializa la escena Three.js
     * @returns {Promise<void>}
     */
    async init() {
        if (this.isInitialized) return;
        
        // Scene
        this.scene = new THREE.Scene();
        
        // Renderer
        this._setupRenderer();
        
        // Camera
        this._setupCamera();
        
        // Controls
        this._setupControls();
        
        // Lights
        this._setupLights();
        
        // Loaders
        this._setupLoaders();
        
        // Events
        window.addEventListener('resize', this._onResize);
        
        // Start render loop
        this.isAnimating = true;
        this._animate();
        
        this.isInitialized = true;
    }
    
    /**
     * Configura el renderer WebGL
     */
    _setupRenderer() {
        const cfg = this.config.renderer;
        
        this.renderer = new THREE.WebGLRenderer({
            antialias: cfg.antialias,
            alpha: true,
            premultipliedAlpha: false,
            preserveDrawingBuffer: true
        });
        
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        
        // Tone mapping
        const toneMappings = {
            'ACESFilmic': THREE.ACESFilmicToneMapping,
            'Linear': THREE.LinearToneMapping,
            'Reinhard': THREE.ReinhardToneMapping,
            'Cineon': THREE.CineonToneMapping
        };
        this.renderer.toneMapping = toneMappings[cfg.toneMapping] || THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = cfg.toneMappingExposure;
        
        // Shadows
        this.renderer.shadowMap.enabled = cfg.shadowMapEnabled;
        const shadowTypes = {
            'Basic': THREE.BasicShadowMap,
            'PCF': THREE.PCFShadowMap,
            'PCFSoft': THREE.PCFSoftShadowMap,
            'VSM': THREE.VSMShadowMap
        };
        this.renderer.shadowMap.type = shadowTypes[cfg.shadowMapType] || THREE.PCFSoftShadowMap;
        
        // Background
        if (this.config.background === 'transparent') {
            this.renderer.setClearColor(0x000000, 0);
        } else {
            this.renderer.setClearColor(new THREE.Color(this.config.background), 1);
        }
        
        this.container.appendChild(this.renderer.domElement);
    }
    
    /**
     * Configura la cámara
     */
    _setupCamera() {
        const cfg = this.config.camera;
        
        this.camera = new THREE.PerspectiveCamera(
            cfg.fov,
            this.container.clientWidth / this.container.clientHeight,
            cfg.near,
            cfg.far
        );
        
        this.camera.position.set(cfg.position.x, cfg.position.y, cfg.position.z);
    }

    /**
     * Cambia a cámara isométrica (ortográfica)
     * @param {Object} options
     * @param {number} options.size - Tamaño del frustum ortográfico
     * @param {Object} options.position - {x,y,z}
     * @param {Object} options.target - {x,y,z}
     */
    setIsometricCamera(options = {}) {
        const size = options.size ?? 2.2;
        const pos = options.position ?? { x: 2.5, y: 2.0, z: 2.5 };
        const target = options.target ?? { x: 0, y: 1.1, z: 0 };
        const aspect = this.container.clientWidth / this.container.clientHeight;
        const halfW = size * aspect;
        const halfH = size;

        this.camera = new THREE.OrthographicCamera(
            -halfW,
            halfW,
            halfH,
            -halfH,
            0.1,
            100
        );
        this.camera.position.set(pos.x, pos.y, pos.z);
        this.camera.lookAt(new THREE.Vector3(target.x, target.y, target.z));
        this.camera.updateProjectionMatrix();

        if (this.controls) {
            this.controls.dispose();
        }
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.screenSpacePanning = true;
        this.controls.target.set(target.x, target.y, target.z);
        this.controls.update();
    }
    
    /**
     * Configura los controles orbitales
     */
    _setupControls() {
        const cfg = this.config.camera;
        
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.screenSpacePanning = true;
        this.controls.target.set(cfg.target.x, cfg.target.y, cfg.target.z);
        this.controls.update();
    }
    
    /**
     * Configura el sistema de luces PBR
     */
    _setupLights() {
        const lights = this.config.lights;
        
        // Main directional light
        if (lights.main.enabled) {
            const main = new THREE.DirectionalLight(lights.main.color, lights.main.intensity);
            main.position.set(lights.main.position.x, lights.main.position.y, lights.main.position.z);
            
            if (lights.main.castShadow) {
                main.castShadow = true;
                const shadow = lights.main.shadow;
                main.shadow.mapSize.width = shadow.mapSize;
                main.shadow.mapSize.height = shadow.mapSize;
                main.shadow.camera.near = shadow.near;
                main.shadow.camera.far = shadow.far;
                main.shadow.bias = shadow.bias;
                main.shadow.normalBias = shadow.normalBias;
                main.shadow.radius = shadow.radius;
            }
            
            this.scene.add(main);
        }
        
        // Fill light
        if (lights.fill.enabled) {
            const fill = new THREE.DirectionalLight(lights.fill.color, lights.fill.intensity);
            fill.position.set(lights.fill.position.x, lights.fill.position.y, lights.fill.position.z);
            this.scene.add(fill);
        }
        
        // Back light (rim)
        if (lights.back.enabled) {
            const back = new THREE.DirectionalLight(lights.back.color, lights.back.intensity);
            back.position.set(lights.back.position.x, lights.back.position.y, lights.back.position.z);
            this.scene.add(back);
        }
        
        // Bottom light
        if (lights.bottom.enabled) {
            const bottom = new THREE.DirectionalLight(lights.bottom.color, lights.bottom.intensity);
            bottom.position.set(lights.bottom.position.x, lights.bottom.position.y, lights.bottom.position.z);
            this.scene.add(bottom);
        }
        
        // Front fill
        if (lights.front.enabled) {
            const front = new THREE.DirectionalLight(lights.front.color, lights.front.intensity);
            front.position.set(lights.front.position.x, lights.front.position.y, lights.front.position.z);
            this.scene.add(front);
        }
        
        // Hemisphere light
        if (lights.hemisphere.enabled) {
            const hemi = new THREE.HemisphereLight(
                lights.hemisphere.skyColor,
                lights.hemisphere.groundColor,
                lights.hemisphere.intensity
            );
            this.scene.add(hemi);
        }
        
        // Ambient light
        if (lights.ambient.enabled) {
            const ambient = new THREE.AmbientLight(lights.ambient.color, lights.ambient.intensity);
            this.scene.add(ambient);
        }
    }
    
    /**
     * Configura los loaders
     */
    _setupLoaders() {
        this.gltfLoader = new GLTFLoader();
        this.gltfLoader.register((parser) => new VRMLoaderPlugin(parser));
        
        this.fbxLoader = new FBXLoader();
        this.textureLoader = new THREE.TextureLoader();
    }
    
    /**
     * Carga un modelo VRM
     * @param {string} path - Ruta al archivo .vrm
     * @param {Function} onProgress - Callback de progreso (opcional)
     * @returns {Promise<Object>} - Instancia VRM
     */
    async loadVRM(path, onProgress) {
        return new Promise((resolve, reject) => {
            this.gltfLoader.load(
                path,
                (gltf) => {
                    const vrm = gltf.userData.vrm;
                    
                    if (!vrm) {
                        reject(new Error('El archivo no contiene datos VRM válidos'));
                        return;
                    }
                    
                    // Remover VRM anterior si existe
                    if (this.vrmScene) {
                        this.scene.remove(this.vrmScene);
                        if (this.vrm) {
                            VRMUtils.deepDispose(this.vrm.scene);
                        }
                    }
                    
                    // Optimizar VRM
                    VRMUtils.removeUnnecessaryJoints(vrm.scene);
                    
                    this.vrm = vrm;
                    this.vrmScene = vrm.scene;
                    
                    // Procesar materiales y configurar meshes
                    this._processVRM();
                    
                    // Agregar a la escena
                    this.scene.add(this.vrmScene);
                    
                    // Rotar para que mire a la cámara
                    this.vrmScene.rotation.y = Math.PI;
                    
                    // Aplicar expresión por defecto
                    this.setExpression(
                        this.config.expression.default,
                        this.config.expression.intensity
                    );
                    
                    resolve(vrm);
                },
                (progress) => {
                    if (onProgress) {
                        const percent = (progress.loaded / progress.total) * 100;
                        onProgress(percent);
                    }
                },
                (error) => {
                    reject(error);
                }
            );
        });
    }
    
    /**
     * Procesa el VRM cargado: encuentra materiales y configura meshes
     */
    _processVRM() {
        this.vrmScene.traverse((object) => {
            // Desactivar frustum culling
            object.frustumCulled = false;
            
            if (object.isMesh) {
                // Habilitar sombras
                object.castShadow = true;
                object.receiveShadow = true;
                
                // Identificar materiales
                const material = object.material;
                if (material) {
                    const name = material.name?.toLowerCase() || '';
                    
                    // Skin
                    if (name === 'skin' || name.includes('skin')) {
                        this.materials.skin = material;
                    }
                    
                    // Left Eye
                    if ((name.includes('eye') && name.includes('l')) || 
                        material.name === 'fake eye.l.001') {
                        this.materials.leftEye = material;
                    }
                    
                    // Right Eye
                    if ((name.includes('eye') && name.includes('r')) ||
                        material.name === 'fake eye.r.001') {
                        this.materials.rightEye = material;
                    }
                    
                    // Hoodie
                    if (name === 'test' || 
                        name.includes('golden yellow') ||
                        name.includes('hoodie') ||
                        name.includes('hood') ||
                        name.includes('sweater') ||
                        name.includes('shirt') ||
                        name.includes('outfit') ||
                        name.includes('clothes') ||
                        material.name === '09-Golden Yellow #FFBF0B GFAR.001' ||
                        material.name === 'Test') {
                        this.materials.hoodie = material;
						
                        // Forzar hoodie blanco sólido
                        material.map = null;
                        material.color.setHex(0xffffff);
                        material.roughness = 0.8;
                        material.metalness = 0.0;
                        material.emissive = new THREE.Color(0x000000);
                        material.needsUpdate = true;
                    }
                }
            }
        });
    }
    
    /**
     * Carga y reproduce una animación FBX de Mixamo
     * @param {string} fbxPath - Ruta al archivo .fbx
     * @param {number} speed - Velocidad de reproducción (default: config.animation.defaultSpeed)
     * @returns {Promise<THREE.AnimationAction>}
     */
    async playAnimation(fbxPath, speed) {
        if (!this.vrm) {
            throw new Error('Debe cargar un VRM antes de reproducir animaciones');
        }
        
        const animSpeed = speed ?? this.config.animation.defaultSpeed;
        
        // Reset pose antes de aplicar animación
        this.vrm.humanoid?.resetNormalizedPose();
        
        return new Promise((resolve, reject) => {
            this.fbxLoader.load(
                fbxPath,
                (fbx) => {
                    const clip = this._convertMixamoAnimation(fbx);
                    
                    if (!clip) {
                        reject(new Error('No se encontraron animaciones en el FBX'));
                        return;
                    }
                    
                    // Crear o resetear mixer
                    if (this.mixer) {
                        this.mixer.stopAllAction();
                    }
                    this.mixer = new THREE.AnimationMixer(this.vrm.scene);
                    
                    // Crear y configurar action
                    const action = this.mixer.clipAction(clip);
                    action.setLoop(THREE.LoopRepeat, Infinity);
                    action.clampWhenFinished = false;
                    action.timeScale = animSpeed;
                    action.play();
                    
                    this.currentAction = action;
                    
                    resolve(action);
                },
                undefined,
                (error) => {
                    reject(error);
                }
            );
        });
    }
    
    /**
     * Convierte una animación Mixamo FBX a formato compatible con VRM
     * @param {Object} fbx - Objeto FBX cargado
     * @returns {THREE.AnimationClip|null}
     */
    _convertMixamoAnimation(fbx) {
        // Buscar el clip de animación de Mixamo
        const clip = THREE.AnimationClip.findByName(fbx.animations, 'mixamo.com') || fbx.animations[0];
        if (!clip) return null;
        
        const tracks = [];
        const restRotationInverse = new THREE.Quaternion();
        const parentRestWorldRotation = new THREE.Quaternion();
        const _quatA = new THREE.Quaternion();
        const _vec3 = new THREE.Vector3();
        
        // Calcular escala de altura para hips
        const motionHipsHeight = fbx.getObjectByName('mixamorigHips')?.position.y;
        const vrmHipsY = this.vrm.humanoid?.getNormalizedBoneNode('hips')?.getWorldPosition(_vec3).y;
        const vrmRootY = this.vrm.scene.getWorldPosition(_vec3).y;
        const vrmHipsHeight = Math.abs(vrmHipsY - vrmRootY);
        const hipsPositionScale = vrmHipsHeight / motionHipsHeight;
        
        clip.tracks.forEach((track) => {
            const trackSplitted = track.name.split('.');
            const mixamoRigName = trackSplitted[0];
            const vrmBoneName = MixamoRigMap[mixamoRigName];
            const vrmNodeName = this.vrm.humanoid?.getNormalizedBoneNode(vrmBoneName)?.name;
            const mixamoRigNode = fbx.getObjectByName(mixamoRigName);
            
            if (vrmNodeName != null && mixamoRigNode != null) {
                const propertyName = trackSplitted[1];
                
                // IMPORTANTE: Obtener rotaciones del nodo FBX de Mixamo, NO del VRM
                mixamoRigNode.getWorldQuaternion(restRotationInverse).invert();
                mixamoRigNode.parent.getWorldQuaternion(parentRestWorldRotation);
                
                if (track instanceof THREE.QuaternionKeyframeTrack) {
                    // Modificar values in-place como hace el código original
                    for (let i = 0; i < track.values.length; i += 4) {
                        const flatQuaternion = track.values.slice(i, i + 4);
                        _quatA.fromArray(flatQuaternion);
                        _quatA.premultiply(parentRestWorldRotation).multiply(restRotationInverse);
                        _quatA.toArray(flatQuaternion);
                        flatQuaternion.forEach((v, index) => {
                            track.values[index + i] = v;
                        });
                    }
                    
                    tracks.push(
                        new THREE.QuaternionKeyframeTrack(
                            `${vrmNodeName}.${propertyName}`,
                            track.times,
                            track.values.map((v, i) => (this.vrm.meta?.metaVersion === '0' && i % 2 === 0 ? -v : v))
                        )
                    );
                } else if (track instanceof THREE.VectorKeyframeTrack) {
                    // Position track - aplicar escala y ajuste de metaVersion
                    const value = track.values.map((v, i) => 
                        (this.vrm.meta?.metaVersion === '0' && i % 3 !== 1 ? -v : v) * hipsPositionScale
                    );
                    tracks.push(new THREE.VectorKeyframeTrack(
                        `${vrmNodeName}.${propertyName}`, 
                        track.times, 
                        value
                    ));
                }
            }
        });
        
        return new THREE.AnimationClip('vrmAnimation', clip.duration, tracks);
    }
    
    /**
     * Detiene la animación actual
     */
    stopAnimation() {
        if (this.mixer) {
            this.mixer.stopAllAction();
        }
        this.currentAction = null;
    }
    
    /**
     * Aplica texturas al VRM
     * @param {Object} textures - { skin?: '01'-'06', eyes?: '01'-'05', hoodie?: '01'-'40' }
     * @param {string} basePath - Ruta base a la carpeta textures (default: './textures')
     */
    setTextures(textures, basePath = './textures') {
        if (textures.skin && this.materials.skin) {
            const path = `${basePath}/skin/skin_${textures.skin}.png`;
            this._applyTexture(this.materials.skin, path);
        }
        
        if (textures.eyes) {
            const path = `${basePath}/eyes/eyes_${textures.eyes}.png`;
            
            if (this.materials.leftEye) {
                this._applyTexture(this.materials.leftEye, path);
            }
            
            if (this.materials.rightEye) {
                this._applyTexture(this.materials.rightEye, path, { flipX: true });
            }
        }
        
        // Hoodie textures disabled (solid white only)
    }

    /**
     * Fuerza el hoodie a blanco sólido (sin textura)
     */
    setHoodieWhite() {
        if (!this.materials.hoodie) return;
        this.materials.hoodie.map = null;
        this.materials.hoodie.color.setHex(0xffffff);
        this.materials.hoodie.roughness = 0.8;
        this.materials.hoodie.metalness = 0.0;
        this.materials.hoodie.emissive = new THREE.Color(0x000000);
        this.materials.hoodie.needsUpdate = true;
    }
    
    /**
     * Aplica una textura a un material
     * @param {THREE.Material} material
     * @param {string} path
     * @param {Object} options - { flipX?: boolean }
     */
    _applyTexture(material, path, options = {}) {
        this.textureLoader.load(path, (texture) => {
            texture.flipY = false;
            texture.colorSpace = THREE.SRGBColorSpace;
            
            if (options.flipX) {
                texture.wrapS = THREE.RepeatWrapping;
                texture.repeat.x = -1;
            }
            
            material.map = texture;
            material.needsUpdate = true;
        });
    }
    
    /**
     * Establece una expresión facial en el VRM
     * @param {string} name - Nombre de la expresión ('joy', 'happy', 'smile', etc.)
     * @param {number} value - Intensidad (0.0 - 1.0)
     */
    setExpression(name, value = 1.0) {
        if (!this.vrm?.expressionManager) return;
        
        // Intentar expresión directa
        try {
            this.vrm.expressionManager.setValue(name, value);
        } catch (e) {
            // Fallbacks
            const fallbacks = {
                'joy': ['happy', 'smile'],
                'happy': ['joy', 'smile'],
                'smile': ['happy', 'joy']
            };
            
            const alternatives = fallbacks[name] || [];
            for (const alt of alternatives) {
                try {
                    this.vrm.expressionManager.setValue(alt, value);
                    break;
                } catch (e2) {
                    // Continuar intentando
                }
            }
        }
    }
    
    /**
     * Cambia el color de fondo
     * @param {string} color - 'transparent' o color hex
     */
    setBackground(color) {
        if (color === 'transparent') {
            this.renderer.setClearColor(0x000000, 0);
        } else {
            this.renderer.setClearColor(new THREE.Color(color), 1);
        }
        this.config.background = color;
    }
    
    /**
     * Retorna la instancia VRM actual
     * @returns {Object|null}
     */
    getVRM() {
        return this.vrm;
    }
    
    /**
     * Retorna la escena Three.js
     * @returns {THREE.Scene}
     */
    getScene() {
        return this.scene;
    }
    
    /**
     * Retorna el renderer
     * @returns {THREE.WebGLRenderer}
     */
    getRenderer() {
        return this.renderer;
    }
    
    /**
     * Retorna la cámara
     * @returns {THREE.PerspectiveCamera}
     */
    getCamera() {
        return this.camera;
    }
    
    /**
     * Loop de animación
     */
    _animate() {
        if (!this.isAnimating) return;
        
        this.animationFrameId = requestAnimationFrame(this._animate);
        
        const delta = this.clock.getDelta();
        
        // Update mixer (animaciones)
        if (this.mixer) {
            this.mixer.update(delta);
        }
        
        // Update VRM (expresiones, etc.)
        if (this.vrm) {
            this.vrm.update(delta);
        }
        
        // Update controls
        if (this.controls) {
            this.controls.update();
        }
        
        // Render
        this.renderer.render(this.scene, this.camera);
    }
    
    /**
     * Handler de resize
     */
    _onResize() {
        if (!this.renderer || !this.camera) return;
        
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        
        this.renderer.setSize(width, height);
    }
    
    /**
     * Limpia todos los recursos y detiene la animación
     */
    dispose() {
        this.isAnimating = false;
        
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
        
        window.removeEventListener('resize', this._onResize);
        
        // Dispose VRM
        if (this.vrm) {
            VRMUtils.deepDispose(this.vrm.scene);
        }
        
        // Dispose Three.js
        if (this.controls) {
            this.controls.dispose();
        }
        
        if (this.renderer) {
            this.renderer.dispose();
            this.container.removeChild(this.renderer.domElement);
        }
        
        // Clear references
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.vrm = null;
        this.vrmScene = null;
        this.mixer = null;
        this.currentAction = null;
        this.materials = {};
        this.isInitialized = false;
    }
}

export default RedditAnimation;
