// JavaScript extracted from index.html
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';

// Modified getBasePath function
function getBasePath() {
    const hostname = window.location.hostname;
    const path = window.location.pathname;
    
    // Check if we're on GitHub Pages
    if (hostname.includes('github.io')) {
        const pathParts = path.split('/');
        let repoName = '';
        
        for (let i = 1; i < pathParts.length; i++) {
            if (pathParts[i] && pathParts[i].length > 0) {
                repoName = pathParts[i];
                break;
            }
        }
        
        if (repoName) {
            console.log(`Using GitHub Pages path: /${repoName}/`);
            return `/${repoName}/`;
        }
    }
    
    console.log('Using local development path');
    return './';
}

// Improved image loading function with case variations
function loadImage(img, basePath, filename) {
    return new Promise((resolve) => {
        // Special handling for the myroom/designmyroom case
        if (filename === 'myroom.png' || filename === 'designmyroom.png') {
            const variations = [
                'myroom.png',
                'designmyroom.png',
                'deisgnmyroom.png', // Common typo
                    'myroom.png', // Instead of MYROOM.PNG
                    'myroom.png'  // Instead of MyRoom.png
            ];
            let currentIndex = 0;
            
            const tryNextVariation = () => {
                if (currentIndex >= variations.length) {
                    console.error(`Failed to load image after trying all variations: ${filename}`);
                    resolve(false);
                    return;
                }

                const currentVariation = variations[currentIndex];
                const fullPath = `${basePath}${currentVariation}`;
                
                console.log(`Trying variation ${currentIndex + 1}/${variations.length}: ${fullPath}`);
                
                img.onload = () => {
                    console.log(`Successfully loaded image from: ${fullPath}`);
                    resolve(true);
                };
                
                img.onerror = () => {
                    console.warn(`Failed to load variation: ${fullPath}`);
                    currentIndex++;
                    tryNextVariation();
                };
                
                img.src = fullPath;
            };

            tryNextVariation();
        } else {
            // Normal image loading for other files
            const path = `${basePath}${filename}`;
            console.log(`Loading image from: ${path}`);
            img.onload = () => resolve(true);
            img.onerror = () => resolve(false);
            img.src = path;
        }
    });
}

// Function to test if a file exists
function fileExists(url) {
    // Make sure the URL is lowercase
    url = url.toLowerCase();
    
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('HEAD', url, true);
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    resolve(true);
                } else {
                    resolve(false);
                }
            }
        };
        xhr.onerror = function() {
            resolve(false);
        };
        xhr.send();
    });
}

// Function to get correct asset path with base path and fallbacks
async function getAssetPath(relativePath) {
    // Force lowercase in the path
    relativePath = relativePath.toLowerCase();
    
    // Remove any leading './' from the relativePath if present
    if (relativePath.startsWith('./')) {
        relativePath = relativePath.substring(2);
    }
    
    // Try both with and without "models/" prefix for VRM files
    if (relativePath.endsWith('.vrm') && !relativePath.includes('/')) {
        // Check if file exists in root
        const rootPath = (BASE_PATH + relativePath).toLowerCase();
        const modelsDirPath = (BASE_PATH + 'models/' + relativePath).toLowerCase();
        
        console.log(`Checking if VRM exists at: ${rootPath}`);
        const rootExists = await fileExists(rootPath);
        
        if (rootExists) {
            console.log(`VRM found at: ${rootPath}`);
            return rootPath;
        }
        
        console.log(`Checking if VRM exists at: ${modelsDirPath}`);
        const modelsDirExists = await fileExists(modelsDirPath);
        
        if (modelsDirExists) {
            console.log(`VRM found at: ${modelsDirPath}`);
            return modelsDirPath;
        }
        
        // If neither exists, try lowercase version
        const lowerRootPath = rootPath.toLowerCase();
        const lowerModelsDirPath = modelsDirPath.toLowerCase();
        
        console.log(`Checking lowercase: ${lowerRootPath}`);
        const lowerRootExists = await fileExists(lowerRootPath);
        
        if (lowerRootExists) {
            console.log(`VRM found at lowercase path: ${lowerRootPath}`);
            return lowerRootPath;
        }
        
        console.log(`Checking lowercase: ${lowerModelsDirPath}`);
        const lowerModelsDirExists = await fileExists(lowerModelsDirPath);
        
        if (lowerModelsDirExists) {
            console.log(`VRM found at lowercase path: ${lowerModelsDirPath}`);
            return lowerModelsDirPath;
        }
        
        // If still not found, return the original path with BASE_PATH
        console.warn(`VRM not found at any path, defaulting to: ${BASE_PATH + relativePath}`);
        return BASE_PATH + relativePath;
    }
    
    // For non-VRM files, also use lowercase
    return (BASE_PATH + relativePath).toLowerCase();
}

// Updated URL parameter parsing function
function getURLParameter(name) {
    // Check if the parameter exists in the URL (either as ?param or &param)
    const url = window.location.href;
    const urlParams = new URLSearchParams(window.location.search);
    
    // Debug output
    console.log(`Checking for parameter: ${name} in URL: ${url}`);
    
    // First try exact match with URLSearchParams
    if (urlParams.has(name)) {
        console.log(`Found parameter ${name} using URLSearchParams`);
        return true;
    }
    
    // Then check if it's in the URL as a substring
    if (url.includes(`?${name}`) || url.includes(`&${name}`)) {
        console.log(`Found parameter ${name} as substring in URL`);
        return true;
    }
    
    return false;
}

// Helper functions for texture handling - updated to check more paths
function checkAndHandleHoodieTexture(vrm, hoodieMaterial) {
    for (let i = 1; i <= 40; i++) {
        const hoodieNum = i < 10 ? `0${i}` : `${i}`;
        const paramName = `hoodie-${hoodieNum}`;
        
        if (getURLParameter(paramName)) {
            console.log(`🔄 Applying ${paramName} texture...`);
            
            // Also try with different uppercase/lowercase variations
            const textureNames = [
                `./textures/hoodie/hoodie_${hoodieNum}.png`.toLowerCase(),
                `./textures/Hoodie/Hoodie_${hoodieNum}.png`,
                `./textures/hoodie/Hoodie_${hoodieNum}.png`,
                `./hoodie/hoodie_${hoodieNum}.png`.toLowerCase()
            ];
            
            if (hoodieMaterial) {
                console.log(`Found hoodie material, trying texture names:`, textureNames);
                loadAndApplyTexture(textureNames[0], hoodieMaterial);
                return true;
            } else {
                console.warn("⚠️ No hoodie material found, looking for alternatives...");
                // Try to find another material that might work
                let found = false;
                vrm.scene.traverse((node) => {
                    if (!found && node.material && node.material.name) {
                        const matName = node.material.name.toLowerCase();
                        if (matName.includes('hoodie') || matName === 'test' || matName === 'outfit') {
                            console.log(`Found alternative hoodie material: ${node.material.name}`);
                            loadAndApplyTexture(textureNames[0], node.material);
                            found = true;
                        }
                    }
                });
                return found;
            }
        }
    }
    return false;
}

function checkAndHandleSkinTexture(vrm, skinMaterial) {
    for (let i = 1; i <= 10; i++) {
        const skinNum = i < 10 ? `0${i}` : `${i}`;
        const paramName = `skin-${skinNum}`;
        
        if (getURLParameter(paramName)) {
            console.log(`🔄 Applying ${paramName} texture...`);
            
            // Try multiple variations of the path
            const textureNames = [
                `./textures/skin/skin_${skinNum}.png`.toLowerCase(),
                `./textures/Skin/Skin_${skinNum}.png`,
                `./skin/skin_${skinNum}.png`.toLowerCase(),
                `./textures/skin_${skinNum}.png`.toLowerCase()
            ];
            
            if (skinMaterial) {
                console.log(`Found skin material, trying texture names:`, textureNames);
                // Set roughness to 1 for skin materials
                if (skinMaterial.roughness !== undefined) {
                    skinMaterial.roughness = 1.0;
                }
                loadAndApplyTexture(textureNames[0], skinMaterial);
                return true;
            } else {
                console.warn("⚠️ No skin material found, looking for alternatives...");
                // Try to find another material that might work
                let found = false;
                vrm.scene.traverse((node) => {
                    if (!found && node.material && node.material.name) {
                        const matName = node.material.name.toLowerCase();
                        if (matName.includes('skin')) {
                            console.log(`Found alternative skin material: ${node.material.name}`);
                            if (node.material.roughness !== undefined) {
                                node.material.roughness = 1.0;
                            }
                            loadAndApplyTexture(textureNames[0], node.material);
                            found = true;
                        }
                    }
                });
                return found;
            }
        }
    }
    return false;
}

function checkAndHandleEyesTexture(vrm, leftEyeMaterial, rightEyeMaterial) {
    for (let i = 1; i <= 10; i++) {
        const eyesNum = i < 10 ? `0${i}` : `${i}`;
        const paramName = `eyes-${eyesNum}`;
        
        if (getURLParameter(paramName)) {
            console.log(`🔄 Applying ${paramName} texture...`);
            
            // Try multiple variations of the path
            const texturePath = `./textures/eyes/eyes_${eyesNum}.png`.toLowerCase();
            const textureNames = [
                texturePath,
                `./textures/Eyes/Eyes_${eyesNum}.png`,
                `./eyes/eyes_${eyesNum}.png`.toLowerCase(),
                `./textures/eyes_${eyesNum}.png`.toLowerCase()
            ];
            
            let applied = false;
            
            if (leftEyeMaterial) {
                loadAndApplyTexture(textureNames[0], leftEyeMaterial);
                applied = true;
            }
            
            if (rightEyeMaterial) {
                loadAndApplyTexture(textureNames[0], rightEyeMaterial);
                applied = true;
            }
            
            if (!applied) {
                console.warn("⚠️ No eye materials found, looking for alternatives...");
                // Try to find other eye materials
                vrm.scene.traverse((node) => {
                    if (node.material && node.material.name) {
                        const matName = node.material.name.toLowerCase();
                        if ((matName.includes('eye') && (matName.includes('l') || matName.includes('r'))) || 
                            matName.includes('fake eye')) {
                            console.log(`Found alternative eye material: ${node.material.name}`);
                            loadAndApplyTexture(textureNames[0], node.material);
                            applied = true;
                        }
                    }
                });
            }
            
            return applied;
        }
    }
    return false;
}

// Function to load and apply a texture to a material
function loadAndApplyTexture(texturePath, material) {
    // Normalize the path to lowercase
    texturePath = texturePath.toLowerCase();
    
    if (!material) {
        console.warn(`Material not found for texture: ${texturePath}`);
        return;
    }
    
    console.log(`Attempting to load texture from: ${texturePath}`);
    
    // Create path variations to try
    const baseTexturePath = texturePath.replace('./textures/', '');
    const textureFilename = baseTexturePath.split('/').pop();
    const textureType = baseTexturePath.split('/')[0]; // 'hoodie', 'skin', 'eyes', etc.
    
    // Array of possible paths to try
    const pathsToTry = [
        texturePath,                                  // ./textures/hoodie/hoodie_23.png
        `./${textureType}/${textureFilename}`,        // ./hoodie/hoodie_23.png
        `./textures/${textureFilename}`,              // ./textures/hoodie_23.png
        `./${textureFilename}`,                       // ./hoodie_23.png
        `/textures/${textureType}/${textureFilename}` // /textures/hoodie/hoodie_23.png
    ];
    
    console.log(`Will try these paths in order:`, pathsToTry);
    
    // Function to try loading from multiple paths
    function tryLoadingFromPaths(paths, index = 0) {
        if (index >= paths.length) {
            console.error(`Failed to load texture after trying all paths for: ${textureFilename}`);
            return;
        }
        
        const currentPath = paths[index];
        console.log(`Trying path ${index + 1}/${paths.length}: ${currentPath}`);
        
        const textureLoader = new THREE.TextureLoader();
        textureLoader.load(
            currentPath,
            (texture) => {
                console.log(`✅ Successfully loaded texture from ${currentPath}`);
                
                // Basic texture settings
                texture.flipY = false;
                
                // Assign texture map
                material.map = texture;
                
                // Set roughness to 1 for skin materials
                if (material.name && material.name.toLowerCase().includes('skin')) {
                    material.roughness = 1.0;
                    console.log("Set roughness to 1.0 for skin material");
                }
                
                // Make sure material uses the texture
                material.needsUpdate = true;
                
                console.log(`Applied texture to material: ${material.name || 'unnamed'}`);
            },
            undefined,
            (error) => {
                console.warn(`Failed to load from ${currentPath}, trying next path...`);
                // Try next path
                tryLoadingFromPaths(paths, index + 1);
            }
        );
    }
    
    // Start trying to load from paths
    tryLoadingFromPaths(pathsToTry);
}

// Add the missing updateDebugPanel function before loadVRMModel
function updateDebugPanel(vrm) {
    // If debug panel is hidden, skip the update
    if (!vrm || document.getElementById('debug-panel').style.display === 'none') return;
    
    const materialList = document.getElementById('material-list');
    materialList.innerHTML = '';
    const uniqueMaterials = new Map();
    
    vrm.scene.traverse((node) => {
        if (node.material && !uniqueMaterials.has(node.material.uuid)) {
            uniqueMaterials.set(node.material.uuid, node.material);
        }
    });
    
    uniqueMaterials.forEach((material) => {
        const materialInfo = document.createElement('div');
        materialInfo.className = 'material-info';
        materialInfo.innerHTML = `
            <p><strong>Name:</strong> ${material.name || 'unnamed'}</p>
            <p><strong>Type:</strong> ${material.type}</p>
            <p><strong>Color:</strong> ${material.color ? '#' + material.color.getHexString() : 'N/A'}</p>
            <p><strong>Has Texture:</strong> ${material.map ? 'Yes' : 'No'}</p>
        `;
        materialList.appendChild(materialInfo);
    });
}

// Add this function at the beginning of the script to update the loading progress
function updateLoadingProgress(percent) {
    const loadingImage = document.getElementById('reddit-loading-image');
    const loadingText = document.getElementById('loading-text');
    
    if (loadingImage) {
        // Calculate opacity based on percentage (from 0.4 to 1)
        const opacity = 0.4 + (percent * 0.6 / 100);
        loadingImage.style.opacity = opacity;
        
        // Add pulse animation during loading
        loadingImage.style.animation = 'pulse 1.5s infinite ease-in-out';
    }
    
    if (loadingText) {
        if (percent < 100) {
            loadingText.textContent = `Loading Snoo model... ${Math.round(percent)}%`;
        }
    }
}

function hideLoadingOverlay() {
    const overlay = document.getElementById('loading-overlay');
    const welcomeImg = document.getElementById('welcome-img');
    const meetImg = document.getElementById('meet-img');
    
    if (overlay) {
        overlay.style.opacity = '0';
        setTimeout(() => {
            overlay.style.display = 'none';
            
            // Hide welcome image and show meet image
            welcomeImg.style.display = 'none';
            meetImg.style.display = 'block';
            
            // Animate the meet image
            setTimeout(() => {
                meetImg.style.transition = 'opacity 0.5s, transform 0.8s';
                meetImg.style.opacity = '1';
                meetImg.style.transform = 'translateY(0)';
                
                // Wait for meet.png animation to complete before animating subreddits
                setTimeout(() => {
                    // Get all subreddit items and animate them with staggered delays
                    const subredditItems = document.querySelectorAll('.subreddit-item');
                    subredditItems.forEach((item, index) => {
                        setTimeout(() => {
                            item.classList.add('animate-subreddit');
                        }, 100 * index); // Stagger by 100ms per item
                    });
                }, 600); // Wait 600ms after meet.png starts animating
                
            }, 100);
        }, 500);
    }
}

// Function to handle the loaded VRM model - fixing issue with missing VRM display
function handleLoadedVRM(vrm) {
    // Debug: Log all material names in the VRM model
    console.log("Materials in VRM model:");
    vrm.scene.traverse((node) => {
        if (node.material) {
            console.log(`Material Name: ${node.material.name || 'Unnamed'}`);
        }
    });

    // Debug - Print all materials in the model with more detail
    console.log("=========== DEBUG: ALL MATERIALS ===========");
    const allMaterials = [];
    vrm.scene.traverse((node) => {
        if (node.material && !allMaterials.includes(node.material)) {
            allMaterials.push(node.material);
            console.log(`Material: "${node.material.name}"`);
            console.log(`  - Type: ${node.material.type}`);
            console.log(`  - Color: ${node.material.color ? '#' + node.material.color.getHexString() : 'N/A'}`);
            console.log(`  - Transparent: ${node.material.transparent}`);
            console.log(`  - Opacity: ${node.material.opacity}`);
            console.log(`  - Side: ${node.material.side}`);
            
            // For PBR materials
            if (node.material.metalness !== undefined) {
                console.log(`  - Metalness: ${node.material.metalness}`);
                console.log(`  - Roughness: ${node.material.roughness}`);
            }
        }
    });
    console.log("Total unique materials:", allMaterials.length);
    console.log("===========================================");

    // Find materials to customize
    let skinMaterial = null;
    let leftEyeMaterial = null;
    let rightEyeMaterial = null;
    let hoodieMaterial = null;
    
    vrm.scene.traverse((node) => {
        if (node.material) {
            const matName = node.material.name ? node.material.name.toLowerCase() : '';
            
            // Debug
            console.log(`Checking material: ${node.material.name} (${matName})`);
            
            // Find skin material
            if (matName === "skin" || matName.includes('skin')) {
                skinMaterial = node.material;
                console.log("✅ Found SKIN material:", node.material.name);
            }
            
            // Find eye materials
            if ((matName.includes('eye') && matName.includes('l')) || 
                matName === "fake eye.l.001") {
                leftEyeMaterial = node.material;
                console.log("✅ Found LEFT EYE material:", node.material.name);
            }
            
            if ((matName.includes('eye') && matName.includes('r')) || 
                matName === "fake eye.r.001") {
                rightEyeMaterial = node.material;
                console.log("✅ Found RIGHT EYE material:", node.material.name);
            }
            
            // Find hoodie material - Updated to include the correct material name
            if (node.material.name === "Test" || 
                matName === "test" || 
                node.material.name === "09-Golden Yellow #FFBF0B GFAR.001" || 
                matName.includes("golden yellow")) {
                hoodieMaterial = node.material;
                console.log("✅ Found HOODIE material:", node.material.name);
            }
        }
    });

    // Adjust initial VRM position
    vrm.scene.position.y = 0.5; // Raise the model slightly

    // Disable frustum culling
    vrm.scene.traverse((obj) => {
        obj.frustumCulled = false;
        if (obj.isMesh) {
            obj.castShadow = true;
            obj.receiveShadow = true;
        }
    });
    
    // Initially hide the VRM
    vrm.scene.visible = false;
    
    scene.add(vrm.scene);
    currentVrm = vrm;
    
    // Update loading progress to 100% when model is ready
    updateLoadingProgress(100);
    
    // First hide the loading overlay and then show the VRM with a delay
    setTimeout(() => {
        // Completely hide the loading overlay
        hideLoadingOverlay();
        
        // Wait for the overlay to disappear before showing the VRM
        setTimeout(() => {
            vrm.scene.visible = true;
            vrm.scene.position.y = -5;
            
            const duration = 1.5;
            const startTime = Date.now();
            
            function animatePosition() {
                const now = Date.now();
                const elapsed = (now - startTime) / 1000;
                
                if (elapsed < duration) {
                    const progress = elapsed / duration;
                    const easeOut = 1 - Math.pow(1 - progress, 3);
                    vrm.scene.position.y = -5 + (5 * easeOut);
                    requestAnimationFrame(animatePosition);
                } else {
                    vrm.scene.position.y = 0;
                }
            }
            
            animatePosition();
        }, 600); // Wait 600ms for the overlay to completely disappear
    }, 1500); // Show "Preparing Snoo" for 1.5 seconds
    
    // Update debug panel with material information
    updateDebugPanel(vrm);
    
    // Check for textures
    console.log("Checking for texture parameters in URL...");
    
    // Check for skin texture
    const skinTextureApplied = checkAndHandleSkinTexture(vrm, skinMaterial);
    
    // Check for eyes texture
    const eyesTextureApplied = checkAndHandleEyesTexture(vrm, leftEyeMaterial, rightEyeMaterial);
    
    // Check for hoodie texture
    const hoodieTextureApplied = checkAndHandleHoodieTexture(vrm, hoodieMaterial);
    
    // Check for interest texture
    if (getURLParameter('interest-02')) {
        console.log("🔄 Looking for interest-02 texture...");
        vrm.scene.traverse((node) => {
            if (node.material && node.material.name && 
                (node.material.name.toLowerCase().includes('interest') || 
                 node.material.name.toLowerCase().includes('badge'))) {
                console.log("✅ Found interest material:", node.material.name);
                loadAndApplyTexture('./textures/interest/interest_02.png'.toLowerCase(), node.material);
            }
        });
    }

    // Set expression
    if (vrm.expressionManager) {
        vrm.expressionManager.setValue('joy', 1.0);
    }

    // Load animation
    loadSwingDancingAnimation(vrm);
}

// Fix loadVRMModel function to ensure proper model loading and display
async function loadVRMModel() {
    // Update to show initial loading state
    updateLoadingProgress(0);
    
    // List of possible paths to try for the VRM model
    const pathsToTry = [
        'models/finalsnoo.vrm', // Updated to finalsnoo.vrm
        'finalsnoo.vrm'        // Updated to finalsnoo.vrm
    ];
    
    let loaded = false;
    
    for (const path of pathsToTry) {
        const fullPath = await getAssetPath(path);
        console.log(`Attempting to load VRM from: ${fullPath}`);
        
        try {
            await new Promise((resolve, reject) => {
                loader.load(
                    fullPath,
                    (gltf) => {
                        const vrm = gltf.userData.vrm;
                        console.log(`Successfully loaded VRM from: ${fullPath}`);
                        if (vrm) {
                            handleLoadedVRM(vrm);
                            loaded = true;
                            resolve();
                        } else {
                            console.error("VRM data missing from loaded model");
                            reject(new Error("VRM data missing"));
                        }
                    },
                    (progress) => {
                        // Enhanced progress tracking
                        const percent = 100.0 * (progress.loaded / progress.total) || 0;
                        console.log('Loading model...', percent, '%');
                        updateLoadingProgress(percent);
                    },
                    (error) => {
                        console.warn(`Error loading VRM from ${fullPath}:`, error);
                        reject(error);
                    }
                );
            });
            
            if (loaded) break; // Exit the loop if loading succeeded
        } catch (error) {
            console.warn(`Couldn't load from ${fullPath}, trying next path...`);
        }
    }
    
    // Hide loading overlay after a delay to ensure model is visible
    if (loaded) {
        // We remove this code because hideLoadingOverlay is now
        // handled directly in the handleLoadedVRM function
        // setTimeout(() => {
        //    hideLoadingOverlay();
        // }, 3500);
    } else {
        // Show error and still hide the loading overlay
        console.error('Failed to load VRM model from any of the paths');
        hideLoadingOverlay();
        
        // Show error message to user
        const errorDiv = document.createElement('div');
        errorDiv.style.position = 'fixed';
        errorDiv.style.top = '50%';
        errorDiv.style.left = '50%';
        errorDiv.style.transform = 'translate(-50%, -50%)';
        errorDiv.style.background = 'rgba(255,0,0,0.8)';
        errorDiv.style.color = 'white';
        errorDiv.style.padding = '20px';
        errorDiv.style.borderRadius = '10px';
        errorDiv.style.zIndex = '1000';
        errorDiv.innerHTML = '<h2>Error Loading 3D Model</h2><p>Could not load the VRM model. Please check the console for details.</p>';
        document.body.appendChild(errorDiv);
    }
}

// Define Mixamo to VRM bone mapping with complete bone list
const mixamoVRMRigMap = {
    mixamorigHips: 'hips',
    mixamorigSpine: 'spine',
    mixamorigSpine1: 'chest',
    mixamorigSpine2: 'upperChest',
    mixamorigNeck: 'neck',
    mixamorigHead: 'head',
    mixamorigLeftShoulder: 'leftShoulder',
    mixamorigLeftArm: 'leftUpperArm',
    mixamorigLeftForeArm: 'leftLowerArm',
    mixamorigLeftHand: 'leftHand',
    mixamorigLeftHandThumb1: 'leftThumbMetacarpal',
    mixamorigLeftHandThumb2: 'leftThumbProximal',
    mixamorigLeftHandThumb3: 'leftThumbDistal',
    mixamorigLeftHandIndex1: 'leftIndexProximal',
    mixamorigLeftHandIndex2: 'leftIndexIntermediate',
    mixamorigLeftHandIndex3: 'leftIndexDistal',
    mixamorigLeftHandMiddle1: 'leftMiddleProximal',
    mixamorigLeftHandMiddle2: 'leftMiddleIntermediate',
    mixamorigLeftHandMiddle3: 'leftMiddleDistal',
    mixamorigLeftHandRing1: 'leftRingProximal',
    mixamorigLeftHandRing2: 'leftRingIntermediate',
    mixamorigLeftHandRing3: 'leftRingDistal',
    mixamorigLeftHandPinky1: 'leftLittleProximal',
    mixamorigLeftHandPinky2: 'leftLittleIntermediate',
    mixamorigLeftHandPinky3: 'leftLittleDistal',
    mixamorigRightShoulder: 'rightShoulder',
    mixamorigRightArm: 'rightUpperArm',
    mixamorigRightForeArm: 'rightLowerArm',
    mixamorigRightHand: 'rightHand',
    mixamorigRightHandPinky1: 'rightLittleProximal',
    mixamorigRightHandPinky2: 'rightLittleIntermediate',
    mixamorigRightHandPinky3: 'rightLittleDistal',
    mixamorigRightHandRing1: 'rightRingProximal',
    mixamorigRightHandRing2: 'rightRingIntermediate',
    mixamorigRightHandRing3: 'rightRingDistal',
    mixamorigRightHandMiddle1: 'rightMiddleProximal',
    mixamorigRightHandMiddle2: 'rightMiddleIntermediate',
    mixamorigRightHandMiddle3: 'rightMiddleDistal',
    mixamorigRightHandIndex1: 'rightIndexProximal',
    mixamorigRightHandIndex2: 'rightIndexIntermediate',
    mixamorigRightHandIndex3: 'rightIndexDistal',
    mixamorigRightHandThumb1: 'rightThumbMetacarpal',
    mixamorigRightHandThumb2: 'rightThumbProximal',
    mixamorigRightHandThumb3: 'rightThumbDistal',
    mixamorigLeftUpLeg: 'leftUpperLeg',
    mixamorigLeftLeg: 'leftLowerLeg',
    mixamorigLeftFoot: 'leftFoot',
    mixamorigLeftToeBase: 'leftToes',
    mixamorigRightUpLeg: 'rightUpperLeg',
    mixamorigRightLeg: 'rightLowerLeg',
    mixamorigRightFoot: 'rightFoot',
    mixamorigRightToeBase: 'rightToes'
};

// Replace existing loadMixamoAnimation with this version
function loadMixamoAnimation(url, vrm) {
    const loader = new FBXLoader(); // A loader which loads FBX
    return loader.loadAsync(url).then((asset) => {
        const clip = THREE.AnimationClip.findByName(asset.animations, 'mixamo.com');
        if (!clip) {
            throw new Error('No mixamo.com animation found in asset');
        }

        const tracks = [];
        const restRotationInverse = new THREE.Quaternion();
        const parentRestWorldRotation = new THREE.Quaternion();
        const _quatA = new THREE.Quaternion();
        const _vec3 = new THREE.Vector3();

        // Adjust with reference to hips height
        const motionHipsHeight = asset.getObjectByName('mixamorigHips').position.y;
        const vrmHipsY = vrm.humanoid?.getNormalizedBoneNode('hips').getWorldPosition(_vec3).y;
        const vrmRootY = vrm.scene.getWorldPosition(_vec3).y;
        const vrmHipsHeight = Math.abs(vrmHipsY - vrmRootY);
        const hipsPositionScale = vrmHipsHeight / motionHipsHeight;

        clip.tracks.forEach((track) => {
            const trackSplitted = track.name.split('.');
            const mixamoRigName = trackSplitted[0];
            const vrmBoneName = mixamoVRMRigMap[mixamoRigName];
            const vrmNodeName = vrm.humanoid?.getNormalizedBoneNode(vrmBoneName)?.name;
            const mixamoRigNode = asset.getObjectByName(mixamoRigName);

            if (vrmNodeName != null) {
                const propertyName = trackSplitted[1];
                mixamoRigNode.getWorldQuaternion(restRotationInverse).invert();
                mixamoRigNode.parent.getWorldQuaternion(parentRestWorldRotation);

                if (track instanceof THREE.QuaternionKeyframeTrack) {
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
                            track.values.map((v, i) => (vrm.meta?.metaVersion === '0' && i % 2 === 0 ? -v : v))
                        )
                    );
                } else if (track instanceof THREE.VectorKeyframeTrack) {
                    const value = track.values.map((v, i) => 
                        (vrm.meta?.metaVersion === '0' && i % 3 !== 1 ? -v : v) * hipsPositionScale
                    );
                    tracks.push(new THREE.VectorKeyframeTrack(`${vrmNodeName}.${propertyName}`, track.times, value));
                }
            }
        });

        return new THREE.AnimationClip('vrmAnimation', clip.duration, tracks);
    });
}

// Replace existing loadSwingDancingAnimation with this version
function loadSwingDancingAnimation(vrm) {
    // Reset pose before applying animation
    vrm.humanoid.resetNormalizedPose();
    
    // Create AnimationMixer for VRM
    currentMixer = new THREE.AnimationMixer(vrm.scene);
    
    console.log('Trying direct animation loading approach...');
    loadMixamoAnimation('./snooPointing.fbx'.toLowerCase(), vrm)
        .then((clip) => {
            const action = currentMixer.clipAction(clip);
            action.timeScale = 0.8;
            action.play();
            console.log('Animation loaded successfully using direct approach');
        })
        .catch((directError) => {
            console.warn('Direct animation loading failed:', directError);
            console.log('Falling back to alternative paths...');
            
            // Determine if we're on GitHub Pages
            const isGitHubPages = window.location.hostname === 'mpalenque.github.io';
            
            // Array of possible paths to try in order - MODIFIED TO USE SNOOPOINTING.FBX in lowercase
            const pathsToTry = isGitHubPages ? [
                '/snoo/models/snooPointing.fbx'.toLowerCase(),
                '/snoo/models/snoopointing.fbx'.toLowerCase(),
                '/snoo/snooPointing.fbx'.toLowerCase(),
                '/snoo/snoopointing.fbx'.toLowerCase()
            ] : [
                'models/snooPointing.fbx'.toLowerCase(),
                './models/snooPointing.fbx'.toLowerCase(),
                '../models/snooPointing.fbx'.toLowerCase(),
                'snooPointing.fbx'.toLowerCase(),
                './snooPointing.fbx'.toLowerCase()
            ];

            console.log('Trying alternative paths:', pathsToTry);

            // Function to try loading from each path
            function tryLoadingFromPaths(paths) {
                if (paths.length === 0) {
                    console.error('All paths failed to load animation');
                    return Promise.reject('No more paths to try');
                }

                const currentPath = paths[0];
                console.log('Attempting to load animation from:', currentPath);

                return loadMixamoAnimation(currentPath, vrm)
                    .then((clip) => {
                        console.log('Successfully loaded animation from:', currentPath);
                        return clip;
                    })
                    .catch((error) => {
                        console.warn(`Failed to load from ${currentPath}:`, error);
                        return tryLoadingFromPaths(paths.slice(1));
                    });
            }

            // Start trying paths
            tryLoadingFromPaths(pathsToTry)
                .then((clip) => {
                    const action = currentMixer.clipAction(clip);
                    action.timeScale = 0.7;
                    action.play();
                    console.log('Animation playing successfully');
                })
                .catch((error) => {
                    console.error('All animation loading attempts failed:', error);
                    
                    // Set a default pose instead of animation
                    try {
                        const leftArm = vrm.humanoid?.getNormalizedBoneNode('leftUpperArm');
                        const rightArm = vrm.humanoid?.getNormalizedBoneNode('rightUpperArm');
                        
                        if (leftArm) leftArm.rotation.z = 0.3;
                        if (rightArm) rightArm.rotation.z = -0.3;
                        
                        console.log('Applied static pose as animation fallback');
                    } catch (e) {
                        console.warn('Could not apply fallback pose:', e);
                    }
                });
        });
}

// gltf and vrm
let currentVrm = undefined;
let currentMixer = undefined;
const loader = new GLTFLoader();
loader.crossOrigin = 'anonymous';

loader.register((parser) => {
    return new VRMLoaderPlugin(parser);
});

// Update image sources with better error handling
const BASE_PATH = getBasePath();
console.log("Base path:", BASE_PATH);

// Load subreddit images
document.addEventListener('DOMContentLoaded', function() {
    // Load subreddit images
    document.querySelectorAll('.subreddit-item').forEach(async (img) => {
        const filename = img.getAttribute('data-src');
        if (!filename) return;
        
        // Remove src attribute initially to prevent double loading
        img.removeAttribute('src');
        
        const loaded = await loadImage(img, BASE_PATH, filename);
        if (!loaded) {
            console.warn(`Failed to load image: ${filename}`);
        }
    });

    // Try multiple paths for the VRM model
    loadVRMModel();

    // Share button functionality
    const shareButton = document.getElementById('share-button');
    const shareMessage = document.getElementById('share-message');
    
    if (shareButton) {
        shareButton.addEventListener('click', function() {
            // Get the current URL with all parameters
            const currentUrl = window.location.href;
            const shareText = `Hey! Watch my Snoo and my interests!\n${currentUrl}`;
            
            // Try to copy to clipboard
            navigator.clipboard.writeText(shareText).then(function() {
                // Success
                shareMessage.textContent = 'Copied!';
                shareMessage.className = 'success-message';
                
                // Hide the message after 3 seconds
                setTimeout(function() {
                    shareMessage.style.opacity = '0';
                }, 3000);
            }, function(err) {
                // Error - fallback method
                console.error('Could not copy text: ', err);
                
                // Create a temporary input element
                const tempInput = document.createElement('input');
                tempInput.value = shareText;
                document.body.appendChild(tempInput);
                
                // Select and copy
                tempInput.select();
                
                try {
                    const success = document.execCommand('copy');
                    if (success) {
                        shareMessage.textContent = 'Copied!';
                        shareMessage.className = 'success-message';
                    } else {
                        shareMessage.textContent = shareText;
                        shareMessage.className = 'error-message';
                    }
                } catch (e) {
                    shareMessage.textContent = 'Could not copy message';
                    shareMessage.className = 'error-message';
                }
                
                // Remove the temporary element
                document.body.removeChild(tempInput);
                
                // Hide the message after 3 seconds
                setTimeout(function() {
                    shareMessage.style.opacity = '0';
                }, 3000);
            });
        });
    }
});

// renderer - update to use canvas container
const renderer = new THREE.WebGLRenderer({
    antialias: true, // Enable antialiasing for smoother edges
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
// Enable physically correct lighting for PBR materials
renderer.physicallyCorrectLights = true;
// Enable tone mapping for better dynamic range
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2; // Slightly increased exposure

// Enhanced shadow mapping settings - keep these for soft shadows
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.shadowMap.autoUpdate = true;

// camera
const camera = new THREE.PerspectiveCamera(30.0, window.innerWidth / window.innerHeight, 0.1, 20.0);
// Position camera lower but looking up at the model
camera.position.set(0.0, 0.5, -5.0); // Moved camera down

// scene
const scene = new THREE.Scene();
// Set background to match page color
scene.background = new THREE.Color('#EDEFF1');

// Resize handler
window.addEventListener('resize', () => {
    // Update camera aspect ratio
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    
    // Update renderer size
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Add the canvas to the container
    document.getElementById('canvas-container').appendChild(renderer.domElement);
    
    // camera controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.screenSpacePanning = true;
    controls.target.set(0.0, 1.0, 0.0); // Target stays higher to look up at model
    controls.update();
    
    // PBR realistic lighting setup
    // Main directional light (sun) - Position changed to overhead (zenith)
    const light = new THREE.DirectionalLight(0xffffff, 2.5); // Slightly increased intensity
    light.position.set(0.0, 5.0, -5.0); // Directly overhead position
    light.castShadow = true;
    
    // Improved shadow quality settings - keep these for soft shadows
    light.shadow.mapSize.width = 2048;
    light.shadow.mapSize.height = 2048;
    light.shadow.camera.near = 0.1;
    light.shadow.camera.far = 10;
    // Adjusted shadow camera bounds for overhead perspective
    light.shadow.camera.left = -4;
    light.shadow.camera.right = 4;
    light.shadow.camera.top = 4;
    light.shadow.camera.bottom = -4;
    light.shadow.bias = -0.0005;
    light.shadow.normalBias = 0.02;
    light.shadow.radius = 4; // Softer shadow edges
    scene.add(light);
    
    // Secondary fill light from side - slight adjustment for better balance
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.8);
    fillLight.position.set(-1.0, 1.0, -1.0);
    scene.add(fillLight);
    
    // Backlight for rim lighting effect - keep slight warmth for dimension
    const backLight = new THREE.DirectionalLight(0xfffaf0, 0.8);
    backLight.position.set(0.0, 1.0, -2.0);
    scene.add(backLight);
    
    // NEW: Add a bottom light for illumination from below
    const bottomLight = new THREE.DirectionalLight(0xffffff, 1.0);
    bottomLight.position.set(0.0, -1.0, 0.0); // Position below the model pointing upward
    scene.add(bottomLight);
    
    // NEW: Add a front fill light for better facial illumination
    const frontFillLight = new THREE.DirectionalLight(0xffffff, 0.9);
    frontFillLight.position.set(0.0, 0.5, 2.0); // Position in front of model
    scene.add(frontFillLight);
    
    // Hemisphere light - increased intensity for better ambient light
    const hemisphereLight = new THREE.HemisphereLight(
        0xffffff, // sky color - pure white
        0xffffff, // ground color - pure white
        0.8 // intensity - increased for better ambient illumination
    );
    scene.add(hemisphereLight);
    
    // NEW: Add ambient light to ensure minimum illumination everywhere
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);
    
    // animate
    const clock = new THREE.Clock();
    
    // Animation loop
    function animate() {
        requestAnimationFrame(animate);
    
        const deltaTime = clock.getDelta();
    
        if (currentVrm) {
            // Keep trying to set JOY expression each frame with error handling
            try {
                if (currentVrm.expressionManager) {
                    // Try to set joy expression (or alternatives) every frame
                    try { currentVrm.expressionManager.setValue('joy', 1.0); } catch(e) {}
                    // Fallbacks in case 'joy' isn't available
                    try { currentVrm.expressionManager.setValue('happy', 1.0); } catch(e) {}
                    try { currentVrm.expressionManager.setValue('smile', 1.0); } catch(e) {}
                }
            } catch (error) {
                // Only log this once to avoid spamming the console
                if (!window._expressionErrorLogged) {
                    console.error('Error maintaining expression in animation loop:', error);
                    window._expressionErrorLogged = true;
                }
            }
            
            // Update VRM - this must still run for animation
            currentVrm.update(deltaTime);
        }
    
        if (currentMixer) {
            currentMixer.update(deltaTime);
        }
    
        // Use standard renderer only (no composer)
        renderer.render(scene, camera);
    }
    
    // Start animation loop
    animate();
});