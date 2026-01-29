/**
 * SceneConfig.js
 * Configuración por defecto para la escena Three.js
 * 
 * Todos estos valores pueden ser sobrescritos al instanciar RedditAnimation
 */

export const SceneConfig = {
    // Fondo - 'transparent' o color hex string
    background: 'transparent',
    
    // Cámara
    camera: {
        fov: 30,
        near: 0.1,
        far: 20.0,
        position: { x: 0, y: 0.5, z: -5 },
        target: { x: 0, y: 1.0, z: 0 }
    },
    
    // Renderer
    renderer: {
        antialias: true,
        toneMapping: 'ACESFilmic', // 'ACESFilmic', 'Linear', 'Reinhard', 'Cineon'
        toneMappingExposure: 0.85,
        shadowMapEnabled: true,
        shadowMapType: 'PCFSoft' // 'Basic', 'PCF', 'PCFSoft', 'VSM'
    },
    
    // Sistema de luces PBR
    lights: {
        // Luz principal direccional (sol)
        main: {
            enabled: true,
            color: 0xffffff,
            intensity: 1.6,
            position: { x: 0, y: 5, z: -5 },
            castShadow: true,
            shadow: {
                mapSize: 2048,
                near: 0.1,
                far: 10,
                bias: -0.0005,
                normalBias: 0.02,
                radius: 4
            }
        },
        
        // Luz de relleno lateral
        fill: {
            enabled: true,
            color: 0xffffff,
            intensity: 0.45,
            position: { x: -1, y: 1, z: -1 }
        },
        
        // Luz trasera (rim light)
        back: {
            enabled: true,
            color: 0xfffaf0, // Tono cálido
            intensity: 0.5,
            position: { x: 0, y: 1, z: -2 }
        },
        
        // Luz inferior
        bottom: {
            enabled: true,
            color: 0xffffff,
            intensity: 0.35,
            position: { x: 0, y: -1, z: 0 }
        },
        
        // Luz frontal de relleno
        front: {
            enabled: true,
            color: 0xffffff,
            intensity: 0.5,
            position: { x: 0, y: 0.5, z: 2 }
        },
        
        // Luz hemisférica (cielo/suelo)
        hemisphere: {
            enabled: true,
            skyColor: 0xffffff,
            groundColor: 0x444444,
            intensity: 0.45
        },
        
        // Luz ambiente mínima
        ambient: {
            enabled: true,
            color: 0xffffff,
            intensity: 0.2
        }
    },
    
    // Animación
    animation: {
        defaultSpeed: 0.8,
        loop: true // Siempre en loop infinito
    },
    
    // Expresión facial por defecto
    expression: {
        default: 'joy',
        intensity: 1.0
    }
};

/**
 * Combina configuración custom con defaults
 * @param {Object} customConfig - Configuración personalizada
 * @returns {Object} - Configuración merged
 */
export function mergeConfig(customConfig = {}) {
    return deepMerge(SceneConfig, customConfig);
}

/**
 * Deep merge de objetos
 */
function deepMerge(target, source) {
    const output = { ...target };
    
    for (const key in source) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
            output[key] = deepMerge(target[key] || {}, source[key]);
        } else {
            output[key] = source[key];
        }
    }
    
    return output;
}

export default SceneConfig;
